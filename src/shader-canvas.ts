import {
  Mesh,
  OrthographicCamera,
  PlaneBufferGeometry,
  RawShaderMaterial,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from "three";

import {detectMode, SourceMode} from "./detect-mode";
import {parseErrorMessages, ShaderErrorMessage} from "./parse-error-messages";
import {parseTextureDirectives, TextureDirective} from "./parse-texture-directives";

const legacyVertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const bareVertexShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  attribute vec3 position;
  ${legacyVertexShader}
`;

const defaultUniforms = `
  uniform vec2 iResolution;
  uniform vec2 iMouse;
  uniform float iGlobalTime;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
`;

function extractDiagnostics(material: any): any {
  const program = material.program;
  if (!program) {
    return;
  }
  return program.diagnostics;
}

function nowSeconds(): number {
  return performance.now() / 1000;
}

type Renderer = WebGLRenderer;
export const Renderer = WebGLRenderer;
export type ShaderErrorMessage = ShaderErrorMessage;
export type SourceMode = SourceMode;

export class ShaderCanvas {
  public domElement: HTMLCanvasElement;
  public paused: boolean;

  // overridable for configuration
  public buildTextureURL: (url: string) => string;
  public onShaderLoad: () => void;
  public onShaderError: (messages: ShaderErrorMessage[]) => void;
  public onTextureLoad: () => void;
  public onTextureError: (textureURL: string) => void;

  private renderer: Renderer;
  private rendererIsOwned: boolean;

  private scene: Scene;
  private camera: OrthographicCamera;
  private mesh: Mesh;

  private startTimeSeconds: number;
  private pausedTimeSeconds: number;

  private uniforms: {[name: string]: {value: any}};
  private textures: {[textureID: string]: TextureDirective};

  private animationFrameRequest: number | undefined;

  constructor(options: {domElement?: HTMLCanvasElement, renderer?: Renderer} = {}) {
    this.domElement = options.domElement || document.createElement("canvas");

    this.rendererIsOwned = options.renderer === undefined;
    this.renderer = options.renderer || new WebGLRenderer({canvas: this.domElement});
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Override these for different behavior:
    this.buildTextureURL = (filePath) => filePath;
    this.onShaderLoad = () => undefined;
    this.onShaderError = (messages) => {
      const errorOutput = messages.map((message) => message.text).join("\n");
      throw new Error("shader error:\n" + errorOutput);
    };
    this.onTextureLoad = () => undefined;
    this.onTextureError = (textureURL) => {
      throw new Error("error loading texture " + textureURL);
    };

    this.scene = new Scene();

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.render();

    this.startTimeSeconds = nowSeconds();
    this.pausedTimeSeconds = 0;
    this.paused = false;

    this.uniforms = {
      u_time: {value: 0},
      u_resolution: {value: new Vector2()},
      u_mouse: {value: new Vector2()},
    };
    // Mirror these values for legacy shaders:
    this.uniforms.iGlobalTime = this.uniforms.u_time;
    this.uniforms.iResolution = this.uniforms.u_resolution;
    this.uniforms.iMouse = this.uniforms.u_mouse;

    this.textures = {};

    this.mesh = new Mesh(new PlaneBufferGeometry(2, 2));

    this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    // TODO: remove this listener in dispose()

    this.update = this.update.bind(this);
    this.update();
  }

  public setShader(source: string, mode: SourceMode = "detect"): Promise<ShaderCanvas> {
    if (mode === "detect") {
      mode = detectMode(source);
    }

    const newTextures = parseTextureDirectives(source);
    const oldTextures = this.textures;

    const texPromise = this.setTextures(newTextures);

    const shaderPromise = new Promise<null>((resolve, reject) => {
      const oldMaterial = this.mesh.material as ShaderMaterial;
      this.mesh.material = this.buildMaterial(source, mode);

      this.scene.add(this.mesh); // idempotent (TODO: only do once)

      this.render(); // to force an error

      const diagnostics = extractDiagnostics(this.mesh.material);
      if (diagnostics && !diagnostics.runnable) {
        let prefix = diagnostics.fragmentShader.prefix;
        if (mode === "legacy") {
          prefix += defaultUniforms;
        }

        this.mesh.material.dispose();
        this.setTextures(oldTextures);
        this.mesh.material = oldMaterial;

        const msg = diagnostics.fragmentShader.log;
        const errorMessages = parseErrorMessages(msg, prefix);
        this.onShaderError(errorMessages);
        reject(errorMessages);
      } else {
        oldMaterial.dispose();
        this.onShaderLoad();
        resolve();
      }
    });

    return Promise.all([texPromise, shaderPromise]).then(() => this);
  }

  public loadShader(url: string) {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", () => {
      if (xhr.status >= 400) {
        // FIXME: this is a loadShader error!
        // console.error("loadShader error:", xhr.status, xhr.statusText);
        this.onTextureError(url);
        return;
      }
      this.setShader(xhr.responseText);
    });
    xhr.addEventListener("error", () => {
      // FIXME: this is a loadShader error!
      // console.error("loadShader error:", e);
      this.onTextureError(url);
    });
    xhr.open("GET", url);
    xhr.send();
  }

  private buildMaterial(source: string, mode: SourceMode) {
    const Material = mode === "bare" ? RawShaderMaterial : ShaderMaterial;

    let vertexShader = bareVertexShader;
    if (Material === ShaderMaterial) {
      vertexShader = legacyVertexShader;
    }

    let fragmentShader = source;
    if (mode === "legacy") {
      fragmentShader = defaultUniforms + source;
    }

    return new Material({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
    });
  }

  public setSize(width: number, height: number): void {
    const dpr = window.devicePixelRatio;

    this.uniforms.u_resolution.value.x = width * dpr;
    this.uniforms.u_resolution.value.y = height * dpr;

    this.renderer.setSize(width, height);
    if (!this.rendererIsOwned) {
      this.domElement.width = width * dpr;
      this.domElement.height = height * dpr;
      this.domElement.style.width = width + "px";
      this.domElement.style.height = height + "px";
    }
  }

  public setTime(timeSeconds: number) {
    this.uniforms.u_time.value = timeSeconds;
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
    if (!this.rendererIsOwned) {
      const ctx = this.domElement.getContext("2d");
      if (!ctx) {
        throw new Error("could not get 2d context");
      }
      ctx.drawImage(this.renderer.domElement, 0, 0);
    }
  }

  private setTextures(textures: {[textureID: string]: TextureDirective}): Promise<ShaderCanvas> {
    const newTextureIDs = [];
    const oldTextureIDs = [];
    for (const id in textures) {
      if (!textures.hasOwnProperty(id)) {
        continue;
      }
      if (!this.textures.propertyIsEnumerable(id)) {
        newTextureIDs.push(id);
        continue;
      }
      if (textures[id].filePath !== this.textures[id].filePath) {
        // Changed, so it's both old and new.
        newTextureIDs.push(id);
        oldTextureIDs.push(id);
      }
    }
    for (const id in this.textures) {
      if (!textures.propertyIsEnumerable(id)) {
        oldTextureIDs.push(id);
      }
    }

    oldTextureIDs.forEach((id) => {
      this.removeTexture(id);
    });
    const promises = newTextureIDs.map((id) => {
      const filePath = textures[id].filePath;
      return this.addTexture(id, filePath);
    });

    return Promise.all(promises).then(() => this);
  }

  private addTexture(textureID: string, filePath: string): Promise<null> {
    if (this.textures[textureID]) {
      throw new Error("tried to add a texture that already exists");
    }

    const textureURL = this.buildTextureURL(filePath);

    return new Promise<null>((resolve, reject) => {
      const onLoad = () => {
        this.onTextureLoad();
        resolve();
      };

      const onError = (e: ErrorEvent) => {
        this.onTextureError(textureURL);
        reject(e);
      };

      const texture = new TextureLoader().load(textureURL, onLoad, undefined, onError);
      this.uniforms[textureID] = {value: texture};
      this.textures[textureID] = {textureID, filePath};

      (this.mesh.material as ShaderMaterial).needsUpdate = true;
    });
  }

  private removeTexture(textureID: string) {
    const texture = this.textures[textureID];
    if (!texture) {
      throw new Error("tried to remove a texture that doesn't exist");
    }
    delete this.textures[textureID];

    this.uniforms[textureID].value.dispose();
    delete this.uniforms[textureID];

    (this.mesh.material as ShaderMaterial).needsUpdate = true;
  }

  public dispose() {
    if (this.rendererIsOwned) {
      this.renderer.dispose();
    }

    if (this.animationFrameRequest !== undefined) {
      cancelAnimationFrame(this.animationFrameRequest);
    }

    // TODO: only remove this if we created it
    this.domElement.remove();
  }

  private onMouseMove(event: MouseEvent) {
    const {width, height} = this.renderer.getSize();
    this.uniforms.u_mouse.value.x = event.offsetX / width;
    this.uniforms.u_mouse.value.y = 1 - (event.offsetY / height);
  }

  private update() {
    if (this.paused) { return; }
    this.animationFrameRequest = requestAnimationFrame(this.update);
    this.setTime(nowSeconds() - this.startTimeSeconds);
    this.render();
  }

  public togglePause(): void {
    this.paused = !this.paused;
    if (!this.paused) {
      // Unpaused now, so move our start time up to account for the time we
      // spent paused:
      this.startTimeSeconds += nowSeconds() - this.pausedTimeSeconds;
    } else {
      this.pausedTimeSeconds = nowSeconds();
    }
    this.update();
  }
}
