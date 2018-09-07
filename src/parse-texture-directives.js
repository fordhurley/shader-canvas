// Looking for lines of the form:
// uniform sampler2D foo; // ../textures/bar.jpg
const re = /^\s*uniform sampler2D (\S+);\s*\/\/\s*(.+)$/gm;

module.exports = function parseTextureDirectives(source) {
  const out = {};
  let match = re.exec(source);
  while (match !== null) {
    const textureID = match[1];
    const filePath = match[2];
    out[textureID] = {textureID, filePath};
    match = re.exec(source);
  }
  return out;
};
