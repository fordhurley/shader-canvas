import {WebGLRenderer, Scene, OrthographicCamera, Clock, Vector2, PlaneBufferGeometry, ShaderMaterial, Mesh, TextureLoader} from "three";
import {difference} from "underscore";

function parseLineNumberFromErrorMsg(msg) {
  const match = /ERROR: \d+:(\d+)/.exec(msg);
  let lineNumber = null;
  if (match && match[1]) {
    lineNumber = parseInt(match[1], 10);
  }
  if (lineNumber !== null) {
    const prologueLines = 107; // lines added before the user's shader code, by us or by THREE
    return lineNumber - prologueLines;
  }
  return null;
}

function parseTextureDirectives(source) {
  // Looking for lines of the form:
  // uniform sampler2D foo; // ../textures/bar.jpg
  const test = /^\s*uniform sampler2D (\S+);\s*\/\/\s*(.+)$/gm;
  const textureDirectives = [];
  let match = test.exec(source);
  while (match !== null) {
    textureDirectives.push({
      textureId: match[1],
      filePath: match[2],
    });
    match = test.exec(source);
  }
  return textureDirectives;
}

function devicePixelRatio() {
  return window.devicePixelRatio || 1;
}

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const defaultUniforms = `
  uniform vec2 iResolution;
  uniform vec2 iMouse;
  uniform float iGlobalTime;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
`;

export default class ShaderCanvas {
  constructor(options) {
    options = options || {};

    this.domElement = options.domElement;
    if (!this.domElement) {
      this.domElement = document.createElement("canvas");
    }

    // Override these for different behavior:
    this.buildTextureURL = function(filePath) {
      return filePath;
    };
    this.onShaderLoad = function() {};
    this.onShaderError = function(msg, lineNumber) {
      throw new Error("shader error " + msg);
    };
    this.onTextureLoad = function() {};
    this.onTextureError = function(textureURL) {
      throw new Error("error loading texture " + textureURL);
    };

    this.renderer = new WebGLRenderer({canvas: this.domElement});
    this.renderer.setPixelRatio(devicePixelRatio());

    this.scene = new Scene();

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer.render(this.scene, this.camera);

    this.clock = new Clock(true);
    this.paused = false;

    this.uniforms = {
      iGlobalTime: {value: 0},
      iResolution: {value: new Vector2()},
      iMouse: {value: new Vector2()},
      u_time: {value: 0},
      u_resolution: {value: new Vector2()},
      u_mouse: {value: new Vector2()},
    };

    this.textures = [];

    this.mesh = new Mesh(new PlaneBufferGeometry(2, 2));

    this.renderer.domElement.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    // Don't need to remove this, because we'll just remove the element.

    this._update = this._update.bind(this);
    requestAnimationFrame(this._update);
  }

  setShader(source) {
    const parsedTextures = parseTextureDirectives(source);
    const oldTextures = difference(this.textures, parsedTextures);
    const newTextures = difference(parsedTextures, this.textures);
    oldTextures.forEach(texture => this.removeTexture(texture.textureId));
    newTextures.forEach(texture => this.addTexture(texture.filePath, texture.textureId));

    this.mesh.material.dispose(); // dispose of the old one
    this.mesh.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: defaultUniforms + source,
    });

    this.scene.add(this.mesh); // idempotent

    this.render(); // to force an error
    let diagnostics;
    if (this.mesh.material.program) {
      diagnostics = this.mesh.material.program.diagnostics;
    }
    if (diagnostics && !diagnostics.runnable) {
      this.mesh.material.dispose();
      this.scene.remove(this.mesh);
      const msg = diagnostics.fragmentShader.log;
      this.onShaderError(msg, parseLineNumberFromErrorMsg(msg));
    } else {
      this.onShaderLoad();
    }
  }

  loadShader(url) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", (e) => {
      if (xhr.status >= 400) {
        console.error("loadTexture error:", xhr.status, xhr.statusText);
        this.onTextureError(url);
        return;
      }
      this.setShader(xhr.responseText);
    });
    xhr.addEventListener("error", (e) => {
      console.error("loadTexture error:", e);
      this.onTextureError(url);
    });
    xhr.open("GET", url);
    xhr.send();
  }

  setSize(width, height) {
    const dpr = devicePixelRatio();

    this.uniforms.iResolution.value.x = width * dpr;
    this.uniforms.iResolution.value.y = height * dpr;
    this.uniforms.u_resolution.value.x = this.uniforms.iResolution.value.x;
    this.uniforms.u_resolution.value.y = this.uniforms.iResolution.value.y;

    this.renderer.setSize(width, height);
  }

  render() {
    this.uniforms.iGlobalTime.value = this.clock.getElapsedTime();
    this.uniforms.u_time.value = this.uniforms.iGlobalTime.value;

    this.renderer.render(this.scene, this.camera);
  }

  addTexture(filePath, textureId) {
    const textureURL = this.buildTextureURL(filePath);

    const onLoad = () => {
      this.onTextureLoad();
    };

    const onError = () => {
      this.onTextureError(textureURL);
    };

    const texture = new TextureLoader().load(textureURL, onLoad, null, onError);
    this.uniforms[textureId] = {value: texture};
    this.textures.push({textureURL, textureId});
  }

  removeTexture(textureId) {
    // TODO: keep textures in an object
    const index = this.textures.findIndex(tex => tex.textureId === textureId);
    if (index === -1) {
      throw new Error("tried to remove a texture that doesn't exist");
    }
    this.textures.splice(index, 1);

    this.uniforms[textureId].value.dispose();
    this.uniforms[textureId].value.needsUpdate = true;

    delete this.uniforms[textureId];
  }

  dispose() {
    cancelAnimationFrame(this._update);
    this.domElement = null;

    // TODO: dispose of the THREE stuff
  }

  _onMouseMove() {
    const {width, height} = this.renderer.getSize();

    this.uniforms.iMouse.value.x = event.offsetX / width;
    this.uniforms.iMouse.value.y = 1 - (event.offsetY / height);
    this.uniforms.u_mouse.value.x = this.uniforms.iMouse.value.x;
    this.uniforms.u_mouse.value.y = this.uniforms.iMouse.value.y;
  }

  _update() {
    if (this.paused) { return; }
    requestAnimationFrame(this._update);
    this.render();
  }

  togglePause() {
    this.paused = !this.paused;
    this._update();
  }
};
