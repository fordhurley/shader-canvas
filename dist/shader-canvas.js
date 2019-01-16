"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const three_1 = require("three");
const detect_mode_1 = require("./detect-mode");
const parse_error_messages_1 = require("./parse-error-messages");
const parse_texture_directives_1 = require("./parse-texture-directives");
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
function extractDiagnostics(material) {
    const program = material.program;
    if (!program) {
        return;
    }
    return program.diagnostics;
}
function nowSeconds() {
    return performance.now() / 1000;
}
exports.Renderer = three_1.WebGLRenderer;
class ShaderCanvas {
    constructor(options = {}) {
        this.domElement = options.domElement || document.createElement("canvas");
        this.rendererIsOwned = options.renderer === undefined;
        this.renderer = options.renderer || new three_1.WebGLRenderer({ canvas: this.domElement });
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
        this.scene = new three_1.Scene();
        this.camera = new three_1.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.z = 1;
        this.render();
        this.startTimeSeconds = nowSeconds();
        this.pausedTimeSeconds = 0;
        this.paused = false;
        this.uniforms = {
            u_time: { value: 0 },
            u_resolution: { value: new three_1.Vector2() },
            u_mouse: { value: new three_1.Vector2() },
        };
        // Mirror these values for legacy shaders:
        this.uniforms.iGlobalTime = this.uniforms.u_time;
        this.uniforms.iResolution = this.uniforms.u_resolution;
        this.uniforms.iMouse = this.uniforms.u_mouse;
        this.textures = {};
        this.mesh = new three_1.Mesh(new three_1.PlaneBufferGeometry(2, 2));
        this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
        // TODO: remove this listener in dispose()
        this.update = this.update.bind(this);
        this.update();
    }
    setShader(source, mode = "detect") {
        if (mode === "detect") {
            mode = detect_mode_1.detectMode(source);
        }
        const newTextures = parse_texture_directives_1.parseTextureDirectives(source);
        const oldTextures = this.textures;
        const texPromise = this.setTextures(newTextures);
        const shaderPromise = new Promise((resolve, reject) => {
            const oldMaterial = this.mesh.material;
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
                const errorMessages = parse_error_messages_1.parseErrorMessages(msg, prefix);
                this.onShaderError(errorMessages);
                reject(errorMessages);
            }
            else {
                oldMaterial.dispose();
                this.onShaderLoad();
                resolve();
            }
        });
        return Promise.all([texPromise, shaderPromise]).then(() => this);
    }
    loadShader(url) {
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
    buildMaterial(source, mode) {
        const Material = mode === "bare" ? three_1.RawShaderMaterial : three_1.ShaderMaterial;
        let vertexShader = bareVertexShader;
        if (Material === three_1.ShaderMaterial) {
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
    setSize(width, height) {
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
    setTime(timeSeconds) {
        this.uniforms.u_time.value = timeSeconds;
    }
    render() {
        this.renderer.render(this.scene, this.camera);
        if (!this.rendererIsOwned) {
            const ctx = this.domElement.getContext("2d");
            if (!ctx) {
                throw new Error("could not get 2d context");
            }
            ctx.drawImage(this.renderer.domElement, 0, 0);
        }
    }
    setTextures(textures) {
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
    addTexture(textureID, filePath) {
        if (this.textures[textureID]) {
            throw new Error("tried to add a texture that already exists");
        }
        const textureURL = this.buildTextureURL(filePath);
        return new Promise((resolve, reject) => {
            const onLoad = () => {
                this.onTextureLoad();
                resolve();
            };
            const onError = (e) => {
                this.onTextureError(textureURL);
                reject(e);
            };
            const texture = new three_1.TextureLoader().load(textureURL, onLoad, undefined, onError);
            this.uniforms[textureID] = { value: texture };
            this.textures[textureID] = { textureID, filePath };
            this.mesh.material.needsUpdate = true;
        });
    }
    removeTexture(textureID) {
        const texture = this.textures[textureID];
        if (!texture) {
            throw new Error("tried to remove a texture that doesn't exist");
        }
        delete this.textures[textureID];
        this.uniforms[textureID].value.dispose();
        delete this.uniforms[textureID];
        this.mesh.material.needsUpdate = true;
    }
    dispose() {
        if (this.rendererIsOwned) {
            this.renderer.dispose();
        }
        if (this.animationFrameRequest !== undefined) {
            cancelAnimationFrame(this.animationFrameRequest);
        }
        // TODO: only remove this if we created it
        this.domElement.remove();
    }
    onMouseMove(event) {
        const { width, height } = this.renderer.getSize();
        this.uniforms.u_mouse.value.x = event.offsetX / width;
        this.uniforms.u_mouse.value.y = 1 - (event.offsetY / height);
    }
    update() {
        if (this.paused) {
            return;
        }
        this.animationFrameRequest = requestAnimationFrame(this.update);
        this.setTime(nowSeconds() - this.startTimeSeconds);
        this.render();
    }
    togglePause() {
        this.paused = !this.paused;
        if (!this.paused) {
            // Unpaused now, so move our start time up to account for the time we
            // spent paused:
            this.startTimeSeconds += nowSeconds() - this.pausedTimeSeconds;
        }
        else {
            this.pausedTimeSeconds = nowSeconds();
        }
        this.update();
    }
}
exports.ShaderCanvas = ShaderCanvas;
//# sourceMappingURL=shader-canvas.js.map