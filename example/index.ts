import {ShaderCanvas, ShaderErrorMessage, SourceMode} from "../src/shader-canvas";
import "./style.css";

var SIZE = 300;

function testShaderWithError(shader: string, sourceMode: SourceMode, expectedErrors: ShaderErrorMessage[]) {
  var placeholder = document.createElement("div");
  placeholder.classList.add("placeholder");
  placeholder.style.width = SIZE+"px";
  placeholder.style.height = SIZE+"px";
  document.body.appendChild(placeholder);

  var shaderCanvas = new ShaderCanvas();
  shaderCanvas.onShaderError = function(messages) {
    var expectedNumErrors = expectedErrors.length;
    var numErrors = messages.length;
    if (numErrors !== expectedNumErrors) {
      placeholder.textContent = `Expected ${expectedNumErrors} shader error, got ${numErrors}`;
      placeholder.classList.add("error");
      return;
    }

    let failureMessage;
    for (let i = 0; i < expectedErrors.length; i++) {
      let expected = expectedErrors[i];
      let error = messages[i];
      if (error.lineNumber !== expected.lineNumber) {
        failureMessage = `Expected error on line ${expected.lineNumber}, got ${error.lineNumber}`;
        break;
      }
      if (error.text !== expected.text) {
        failureMessage = `Expected error "${expected.text}", got "${error.text}"`;
        break;
      }
    }

    if (failureMessage) {
      placeholder.textContent = failureMessage;
      placeholder.classList.add("error");
      console.log(messages);
    } else {
      placeholder.textContent = "Shader errored as expected";
      placeholder.classList.add("success");
    }
  };
  shaderCanvas.onShaderLoad = function() {
    placeholder.textContent = "Expected shader error";
    placeholder.classList.add("error");
  };
  shaderCanvas.setShader(shader, sourceMode);
}

var example1 = new ShaderCanvas();
document.body.appendChild(example1.domElement);
example1.setShader(`
  void main() {
    vec2 uv = gl_FragCoord.xy/iResolution.xy; // [0, 1]
    float num = 16.0; // number of squares along an edge
    vec2 i = floor(uv*num); // integer grid
    float v = mod(i.x + i.y, 2.0); // 0 or 1
    gl_FragColor = vec4(v, v, 0, 1.0); // black and yellow
  }
`);
example1.setSize(SIZE, SIZE);

var example2 = new ShaderCanvas();
document.body.appendChild(example2.domElement);
example2.loadShader("example.glsl");
example2.setSize(SIZE, SIZE);

var example3 = new ShaderCanvas();
document.body.appendChild(example3.domElement);
example3.loadShader("https://raw.githubusercontent.com/fordhurley/atom-glsl-preview/master/examples/frag.glsl");
example3.setSize(SIZE, SIZE);

example3.domElement.addEventListener("click", function(e) {
  e.preventDefault();
  example3.togglePause();
});

testShaderWithError(`void main() {
float a = 1; // error
gl_FragColor = vec4(a, 0.0, 1.0, 1.0);
}`,
  "legacy",
  [
    {lineNumber: 2, text: "ERROR: 2:1: '=' : cannot convert from 'const int' to 'highp float'"},
  ]
);

testShaderWithError(`void main() {
float a = 1; // error
gl_FragColor = vec4(a, 0.0, 1.0, 1.0);
}`,
  "prefixed-without-uniforms",
  [
    {lineNumber: 2, text: "ERROR: 2:1: '=' : cannot convert from 'const int' to 'highp float'"},
  ]
);

testShaderWithError(`int error = 1.0;
void main() {
float a = 1;
gl_FragColor = vec4(a, 0.0, 1.0, 1.0);
}`,
  "legacy",
  [
    {lineNumber: 1, text: "ERROR: 1:1: '=' : cannot convert from 'const float' to 'highp int'"},
    {lineNumber: 3, text: "ERROR: 3:1: '=' : cannot convert from 'const int' to 'highp float'"},
  ]
);

var example7 = new ShaderCanvas();
document.body.appendChild(example7.domElement);
example7.setSize(SIZE, SIZE);
example7.setShader(`
  precision mediump float;
  uniform vec2 u_resolution;
  void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy; // [0, 1]
    gl_FragColor = vec4(uv, 1.0, 1.0);
  }
`, "detect");

var example8 = new ShaderCanvas();
document.body.appendChild(example8.domElement);
example8.setSize(SIZE, SIZE);
example8.setShader(`
  uniform vec2 u_resolution;
  void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy; // [0, 1]
    gl_FragColor = vec4(0.0, 1.0 - uv, 1.0);
  }
`, "prefixed-without-uniforms");

var example9 = new ShaderCanvas();
document.body.appendChild(example9.domElement);
example9.setSize(SIZE, SIZE);
example9.setShader(`
  precision mediump float;
  uniform vec2 u_resolution;
  void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy; // [0, 1]
    gl_FragColor = vec4(1.0, uv, 1.0);
  }
`, "bare");
