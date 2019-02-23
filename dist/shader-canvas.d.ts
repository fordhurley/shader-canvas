export declare class ShaderCanvas {
    domElement: HTMLCanvasElement;
    width: number;
    height: number;
    private gl;
    private vertexShader;
    private fragmentShader;
    private shaderProgram;
    private textures;
    constructor();
    setSize(width: number, height: number): void;
    setShader(source: string): ShaderErrorMessage[];
    setUniform(name: string, value: number[]): void;
    setTexture(name: string, image: HTMLImageElement): void;
    render(): void;
}
export interface ShaderErrorMessage {
    text: string;
    lineNumber: number;
}
