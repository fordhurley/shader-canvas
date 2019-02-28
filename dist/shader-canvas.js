const defaultVertexShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;
const defaultFragmentShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  void main() {
    gl_FragColor = vec4(0.0);
  }
`;
export class ShaderCanvas {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.textures = {};
        this.domElement = document.createElement("canvas");
        const gl = this.domElement.getContext("webgl");
        if (!gl) {
            throw new Error("failed to get webgl context");
        }
        this.gl = gl;
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (!vs) {
            throw new Error("failed to create vertex shader");
        }
        this.vertexShader = vs;
        const vsErrs = compileShader(this.gl, this.vertexShader, defaultVertexShader);
        if (vsErrs) {
            throw new Error("failed to compile vertex shader");
        }
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (!fs) {
            throw new Error("failed to create fragment shader");
        }
        this.fragmentShader = fs;
        const fsErrs = compileShader(this.gl, this.fragmentShader, defaultFragmentShader);
        if (fsErrs) {
            throw new Error("failed to compile vertex shader");
        }
        this.shaderProgram = createShaderProgram(this.gl, this.vertexShader, this.fragmentShader);
        bindPositionAttribute(this.gl, this.shaderProgram);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.useProgram(this.shaderProgram);
        this.setSize(400, 400);
    }
    setSize(width, height) {
        this.width = width;
        this.height = height;
        const dpr = window.devicePixelRatio;
        this.domElement.width = width * dpr;
        this.domElement.height = height * dpr;
        this.domElement.style.width = width + "px";
        this.domElement.style.height = height + "px";
        this.gl.viewport(0, 0, this.domElement.width, this.domElement.height);
    }
    // getResolution is a convenience method for getting a vec2 representing the
    // size in physical pixels of the canvas.
    // Typical usage is:
    //   shaderCanvas.setUniform("u_resolution", shaderCanvas.getResolution());
    getResolution() {
        return [
            this.domElement.width,
            this.domElement.height,
        ];
    }
    setShader(source) {
        const gl = this.gl;
        const errs = compileShader(gl, this.fragmentShader, source);
        if (errs) {
            return errs;
        }
        gl.linkProgram(this.shaderProgram);
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.shaderProgram));
            throw new Error("failed to link program");
        }
    }
    setUniform(name, value) {
        // TODO: validate name?
        // TODO OPTIMIZE: cache uniform location
        const location = this.gl.getUniformLocation(this.shaderProgram, name);
        if (location === null) {
            throw new Error(`uniform location for ${name} not found`);
        }
        if (typeof value === "number") {
            this.gl.uniform1f(location, value);
            return;
        }
        switch (value.length) {
            case 2:
                this.gl.uniform2fv(location, value);
                break;
            case 3:
                this.gl.uniform3fv(location, value);
                break;
            case 4:
                this.gl.uniform4fv(location, value);
                break;
        }
    }
    // TODO: accept options, like format, filter, wrap, etc.
    setTexture(name, image) {
        // TODO: validate name?
        const gl = this.gl;
        let t = this.textures[name];
        if (!t) {
            const glTexture = gl.createTexture();
            if (!glTexture) {
                throw new Error(`unable to create glTexture`);
            }
            t = {
                glTexture,
                unit: lowestUnused(Object.keys(this.textures).map((k) => this.textures[k].unit)),
            };
            this.textures[name] = t;
        }
        gl.activeTexture(gl.TEXTURE0 + t.unit);
        gl.bindTexture(gl.TEXTURE_2D, t.glTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        const location = gl.getUniformLocation(this.shaderProgram, name);
        if (location === null) {
            throw new Error(`uniform location for texture ${name} not found`);
        }
        gl.uniform1i(location, t.unit);
    }
    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
function compileShader(gl, shader, source) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return;
    }
    const info = gl.getShaderInfoLog(shader);
    if (!info) {
        throw new Error("failed to compile, but found no error log");
    }
    console.error(info);
    return parseErrorMessages(info);
}
function createShaderProgram(gl, vs, fs) {
    const program = gl.createProgram();
    if (program === null) {
        throw new Error("failed to create shader program");
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        console.error(info);
        throw new Error("failed to link program");
    }
    return program;
}
function bindPositionAttribute(gl, program) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positions = new Float32Array([
        -1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);
}
function parseErrorMessages(msg) {
    const errorRegex = /^ERROR: \d+:(\d+).*$/mg;
    const messages = [];
    let match = errorRegex.exec(msg);
    while (match) {
        messages.push({
            text: match[0],
            lineNumber: parseInt(match[1], 10),
        });
        // Look for another error:
        match = errorRegex.exec(msg);
    }
    return messages;
}
// This is a flavor of Shlemiel the painter's algorithm.
// http://wiki.c2.com/?ShlemielThePainter
//
// TODO: figure out how to run tests, but I've spot checked these:
//   [] => 0
//   [0, 1, 2, 3, 4] => 5
//   [0, 1, 3, 4] => 2
//   [1, 3, 4] => 0
//   [4] => 0
//   [4, 3, 2, 1, 0] => 5
//   [4, 2, 1, 0] => 3
//   [4, 2, 1, 10] => 0
//   [2, 0, 3, 4] => 1
function lowestUnused(xs) {
    let unused = 0;
    for (let i = 0; i < xs.length; i++) {
        if (xs[i] === unused) {
            unused++;
            i = -1; // go back to the beginning
        }
    }
    return unused;
}
