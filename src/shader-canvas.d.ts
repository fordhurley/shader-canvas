export interface ShaderErrorMessage {
  test: string;
  lineNumber: number;
}

export class Renderer {
  setSize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
}

export type SourceMode = "detect" | "prefixed-without-uniforms" | "legacy" | "bare";

export default class ShaderCanvas {
  constructor(options: {domElement?: HTMLElement, renderer?: Renderer});

  domElement: HTMLElement;
  paused: boolean;

  // overridable for configuration
  buildTextureURL(url: string): string;
  onShaderLoad(): void;
  onShaderError(messages: ShaderErrorMessage[]): void;
  onTextureLoad(): void
  onTextureError(textureURL: string): void;

  setSize(width: number, height: number): void;
  setShader(source: string, mode: SourceMode): void;
  togglePause(): void;
  render(): void;
}
