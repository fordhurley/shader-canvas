# shader-canvas

shader-canvas provides a thin, barebones wrapper around the WebGL API for
running basic fragment shaders like those found in
[The Book of Shaders](https://thebookofshaders.com/). It is unopinionated,
providing no uniforms or attributes by default.

The entire library is tiny (~2kB compressed), so it can be used to add images
and patterns on websites with a significantly smaller download than an image,
GIF, or video.


## Basic example

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
