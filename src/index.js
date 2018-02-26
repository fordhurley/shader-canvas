// For compatiblity with node, we need to use module.exports / require at this
// entrypoint.

const ShaderCanvas = require("./shader-canvas");
module.exports = ShaderCanvas.default;
module.exports.Renderer = ShaderCanvas.Renderer;
