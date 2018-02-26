const {WebGLRenderer, Scene, OrthographicCamera, Vector2, PlaneBufferGeometry, ShaderMaterial, Mesh, TextureLoader} = require("three");
const {difference} = require("underscore");

const parseErrorMessages = require("./parse-error-messages");
const parseTextureDirectives = require("./parse-texture-directives");

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

module.exports = class ShaderCanvas {
  constructor(options) {
    options = options || {};

    this.domElement = options.domElement;
    if (!this.domElement) {
      this.domElement = document.createElement("canvas");
    }

    this.renderer = options.renderer;
    this.rendererIsOwned = false;
    if (!this.renderer) {
      this.renderer = new WebGLRenderer({canvas: this.domElement});
      this.rendererIsOwned = true;
    }
    this.renderer.setPixelRatio(devicePixelRatio());

    // Override these for different behavior:
    this.buildTextureURL = function(filePath) {
      return filePath;
    };
    this.onShaderLoad = function() {};
    this.onShaderError = messages => {
      const errorOutput = messages.map(message => message.text).join('\n');
      throw new Error("shader error:\n" + errorOutput);
    };
    this.onTextureLoad = function() {};
    this.onTextureError = function(textureURL) {
      throw new Error("error loading texture " + textureURL);
    };

    this.scene = new Scene();

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer.render(this.scene, this.camera);

    this.startTimeSeconds = performance.now()/1000;
    this.pausedTimeSeconds = 0;
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
    this._update();
  }

  setShader(source, includeDefaultUniforms = true) {
    const parsedTextures = parseTextureDirectives(source);
    const oldTextures = difference(this.textures, parsedTextures);
    const newTextures = difference(parsedTextures, this.textures);
    oldTextures.forEach(texture => this.removeTexture(texture.textureId));
    newTextures.forEach(texture => this.addTexture(texture.filePath, texture.textureId));

    this.source = source;

    const prevMaterial = this.mesh.material;

    this.mesh.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: includeDefaultUniforms ? defaultUniforms + source : source,
    });

    this.scene.add(this.mesh); // idempotent

    this.render(); // to force an error
    let diagnostics;
    if (this.mesh.material.program) {
      diagnostics = this.mesh.material.program.diagnostics;
    }
    if (diagnostics) {
      let prefix = diagnostics.fragmentShader.prefix;
      if (includeDefaultUniforms) {
        prefix += defaultUniforms;
      }
      this.prefix = prefix;
    }
    if (diagnostics && !diagnostics.runnable) {
      this.mesh.material.dispose();
      this.mesh.material = prevMaterial;

      const msg = diagnostics.fragmentShader.log;
      this.onShaderError(parseErrorMessages(msg, this.prefix, this.source));
    } else {
      prevMaterial.dispose();
      this.onShaderLoad();
    }
  }

  loadShader(url) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", (e) => {
      if (xhr.status >= 400) {
        // FIXME: this is a loadShader error!
        console.error("loadTexture error:", xhr.status, xhr.statusText);
        this.onTextureError(url);
        return;
      }
      this.setShader(xhr.responseText);
    });
    xhr.addEventListener("error", (e) => {
      // FIXME: this is a loadShader error!
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
    if (!this.rendererIsOwned) {
      this.domElement.width = width * dpr;
      this.domElement.height = height * dpr;
      this.domElement.style.width = width + "px";
      this.domElement.style.height = height + "px";
    }
  }

  setTime(timeSeconds) {
    this.uniforms.iGlobalTime.value = timeSeconds;
    this.uniforms.u_time.value = timeSeconds;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    if (!this.rendererIsOwned) {
      this.domElement.getContext("2d").drawImage(this.renderer.domElement, 0, 0);
    }
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
    this.uniforms[textureId].value.needsUpdate = true; // TODO: needed?

    delete this.uniforms[textureId];
  }

  dispose() {
    if (this.rendererIsOwned) {
      this.renderer.dispose();
    }

    cancelAnimationFrame(this.animationFrameRequest);
    this.domElement = null;
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
    this.animationFrameRequest = requestAnimationFrame(this._update);
    this.setTime((performance.now() / 1000) - this.startTimeSeconds);
    this.render();
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) {
      // Unpaused now, so move our start time up to account for the time we
      // spent paused:
      this.startTimeSeconds += (performance.now() / 1000) - this.pausedTimeSeconds;
    } else {
      this.pausedTimeSeconds = performance.now() / 1000;
    }
    this._update();
  }
};

// So that consumers can construct a shared renderer and pass it to many
// ShaderCanvas instances, without having to depend on THREE directly:
module.exports.Renderer = WebGLRenderer;
