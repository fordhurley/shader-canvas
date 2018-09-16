const errorRegex = /^(ERROR: )\d+:(\d+)(.*)$/mg;
const newLineRegex = /\r?\n/;

export interface ShaderErrorMessage {
  text: string;
  lineNumber: number;
}

export default function parseErrorMessages(msg: string, prefix: string): ShaderErrorMessage[] {
  const out = [];
  let match = errorRegex.exec(msg);
  while (match) {
    let errorLineNumber = -1;
    const lineNumber = parseInt(match[2], 10);
    if (lineNumber !== null) {
      const prefixLines = prefix.split(newLineRegex).length;
      errorLineNumber = lineNumber - prefixLines + 1;
    }
    out.push({
      lineNumber: errorLineNumber,
      text: `${match[1]}${errorLineNumber}:1${match[3]}`,
    });
    match = errorRegex.exec(msg);
  }
  return out;
}
