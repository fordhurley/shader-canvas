// Looking for lines of the form:
// uniform sampler2D foo; // ../textures/bar.jpg
const re = /^\s*uniform sampler2D (\S+);\s*\/\/\s*(.+)$/gm;

export interface TextureDirective {
  textureID: string;
  filePath: string;
}

export function parseTextureDirectives(source: string): {[textureID: string]: TextureDirective} {
  const out: {[textureID: string]: TextureDirective} = {};
  let match = re.exec(source);
  while (match !== null) {
    const textureID = match[1];
    const filePath = match[2];
    out[textureID] = {textureID, filePath};
    match = re.exec(source);
  }
  return out;
}
