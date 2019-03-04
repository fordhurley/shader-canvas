export declare type UniformValue = number | [number, number] | [number, number, number] | [number, number, number, number];
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
    getResolution(): [number, number];
    setShader(source: string): ShaderErrorMessage[] | undefined;
    setUniform(name: string, value: UniformValue): void;
    setTexture(name: string, image: HTMLImageElement): void;
    render(): void;
}
export interface ShaderErrorMessage {
    text: string;
    lineNumber: number;
}
