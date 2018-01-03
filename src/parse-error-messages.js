let errorRegex = /^(ERROR: )\d+:(\d+)(.*)$/mg;
let newLineRegex = /\r?\n/;

export default function parseErrorMessages(msg, prefix, originalShader) {
  let out = [];
  let match = errorRegex.exec(msg);
  while (match) {
    let errorLineNumber = -1;
    let lineNumber = parseInt(match[2], 10);
    if (lineNumber !== null) {
      const prefixLines = prefix.split(newLineRegex).length;
      let glslifyLineNumber = originalShader.split(newLineRegex).findIndex(s => s == "#define GLSLIFY 1");
      errorLineNumber = lineNumber - prefixLines + 1;
      if (glslifyLineNumber !== -1 && errorLineNumber > glslifyLineNumber) {
        errorLineNumber -= 1;
      }
    }
    out.push({
      lineNumber: errorLineNumber,
      text: `${match[1]}${errorLineNumber}:1${match[3]}`,
    });
    match = errorRegex.exec(msg);
  }
  return out;
}
