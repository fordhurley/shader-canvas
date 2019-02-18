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
  public domElement: HTMLCanvasElement;
  public gl: WebGLRenderingContext;

  // private uniforms: {[name: string]: any};

  private vertexShader: WebGLShader;
  private fragmentShader: WebGLShader;
  private shaderProgram: WebGLProgram;

  constructor() {
    this.domElement = document.createElement("canvas");
    this.gl = this.domElement.getContext("webgl")!;

    this.vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, defaultVertexShader)!;
    this.fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, defaultFragmentShader)!;
    this.shaderProgram = compileShader(this.gl, this.vertexShader, this.fragmentShader)!;

    bindPositionAttribute(this.gl, this.shaderProgram);

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.useProgram(this.shaderProgram);

    // this.uniforms = {};

    this.setSize(400, 400);
  }

  public setSize(width: number, height: number): void {
    const dpr = window.devicePixelRatio;
    this.domElement.width = width * dpr;
    this.domElement.height = height * dpr;
    this.domElement.style.width = width + "px";
    this.domElement.style.height = height + "px";

    this.gl.viewport(0, 0, this.domElement.width, this.domElement.height);
  }

  public render() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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

function compileShader(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
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

function bindPositionAttribute(gl: WebGLRenderingContext, program: WebGLProgram) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const positions = new Float32Array([
    -1.0, -1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "position");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLocation);
}
