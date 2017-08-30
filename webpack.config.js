const path = require("path");
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "shader-canvas.min.js",
    path: path.resolve(__dirname, "build"),
    library: "ShaderCanvas",
  },
  plugins: [
    new UglifyJSPlugin(),
  ],
};
