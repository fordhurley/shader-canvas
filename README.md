# shader-canvas

[![Greenkeeper badge](https://badges.greenkeeper.io/fordhurley/shader-canvas.svg)](https://greenkeeper.io/)

```javascript
var shaderCanvas = new ShaderCanvas();
document.body.appendChild(shaderCanvas.domElement);

shaderCanvas.setShader(`
  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    gl_FragColor = vec4(uv.x, 0.0, uv.y, 1.0);
  }
`);

shaderCanvas.setSize(400, 400);
```

Shaders can be loaded from a URL:

```javascript
shaderCanvas.loadShader("shader.glsl");
shaderCanvas.loadShader("//raw.githubusercontent.com/fordhurley/atom-glsl-preview/2c9d19fc/examples/frag.glsl")
```

It can be attached to an existing canvas:

```javascript
var shaderCanvas = new ShaderCanvas({
  domElement: document.getElementById("my-canvas"),
});
```

A full example can be found in `example/`.

## Uniforms

The following default uniforms are included. No need to add these into your
fragment shaders:

```glsl
uniform vec2 iResolution; // size of the preview
uniform vec2 iMouse; // cursor in normalized coordinates [0, 1)
uniform float iGlobalTime; // clock in seconds
```

The variants `u_resolution`, `u_mouse` and `u_time` can also be used to match
the style found in [The Book of Shaders](http://thebookofshaders.com/).


## Textures

Textures can be loaded by defining a uniform with a comment containing the path
to the file. The syntax is:

```glsl
uniform sampler2D <texture_name>; // <path_to_file>
```

For example:

```glsl
uniform sampler2D inThisDirectory; // foo.jpg
uniform sampler2D inOtherDirectory; // ../other_textures/bar.png
uniform sampler2D withAbsolutePath; // /Users/ford/textures/blah.bmp
uniform sampler2D withURL; // https://example.com/textures/blah.bmp
```

If you need to modify the path before attempting to load the texture, override
the `.buildTextureURL(filePath)` method of the ShaderCanvas instance.


## Handling Errors

Override the following methods to handle errors and successes.

```javascript
.onShaderLoad()
.onShaderError(messages) // messages is an array of {text, lineNumber} objects
.onTextureLoad()
.onTextureError(textureURL)
```

By default, errors throw exceptions.


## Development

Install dependencies:

    npm install

Open the example page in your browser. This will auto-reload as the source
changes. Check that tests on the page are passing.

    make serve

Run the build before committing (at least at the end of your PR work), and check
in the result in `build/`.

    make build


## Credits

Extracted from [atom-glsl-preview](https://github.com/fordhurley/atom-glsl-preview).
