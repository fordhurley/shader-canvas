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
shaderCanvas.setUniform(
  "u_resolution",
  [400 * window.devicePixelRatio, 400 * window.devicePixelRatio],
);
document.body.appendChild(shaderCanvas.domElement);
```

See [example/index.html](example/index.html) for more examples.


## Development

Install dependencies:

    yarn install


Run the typescript watcher:

    yarn run watch


Serve the example page:

    yarn run serve

Open the example page in your browser:

    open http://localhost:8080/example/

## Credits

Extracted from [atom-glsl-preview](https://github.com/fordhurley/atom-glsl-preview).
