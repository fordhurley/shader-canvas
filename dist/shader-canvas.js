const defaultVertexShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;
const defaultFragmentShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  varying vec2 uv;
  void main() {
    gl_FragColor = vec4(uv.x, 0.0, uv.y, 1.0);
  }
`;
export class ShaderCanvas {
    constructor() {
        this.domElement = document.createElement("canvas");
        this.gl = this.domElement.getContext("webgl");
        this.vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, defaultVertexShader);
        this.fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, defaultFragmentShader);
        this.shaderProgram = compileShader(this.gl, this.vertexShader, this.fragmentShader);
        const positionLocation = this.gl.getAttribLocation(this.shaderProgram, "position");
        const buffer = initPositionBuffer(this.gl);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.useProgram(this.shaderProgram);
        // this.uniforms = {};
        this.setSize(400, 400);
    }
    setSize(width, height) {
        const dpr = window.devicePixelRatio;
        this.domElement.width = width * dpr;
        this.domElement.height = height * dpr;
        this.domElement.style.width = width + "px";
        this.domElement.style.height = height + "px";
        this.gl.viewport(0, 0, this.domElement.width, this.domElement.height);
    }
    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (shader === null) {
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function compileShader(gl, vs, fs) {
    const program = gl.createProgram();
    if (program === null) {
        return null;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}
function initPositionBuffer(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positions = new Float32Array([
        -1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    return buffer;
}
//# sourceMappingURL=shader-canvas.js.map