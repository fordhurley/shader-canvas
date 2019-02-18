# shader-canvas

```javascript
import {ShaderCanvas} from "shader-canvas";

var shaderCanvas = new ShaderCanvas();
shaderCanvas.setShader(`
  precision mediump float;

  uniform vec2 u_resolution;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    gl_FragColor = vec4(uv.x, 0.0, uv.y, 1.0);
  }
`);
shaderCanvas.setSize(400, 400);
shaderCanvas.setUniform("u_resolution", [400, 400]);
document.body.appendChild(shaderCanvas.domElement);
```


## Development

Install dependencies:

    npm install


Run the typescript build before committing (at least at the end of your PR work),
and check in the result in `dist/`.

    npm run build


Open the example page in your browser. This will auto-reload as the source
changes. Check that tests on the page are passing.

    npm run example


## Credits

Extracted from [atom-glsl-preview](https://github.com/fordhurley/atom-glsl-preview).
