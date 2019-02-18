export declare class ShaderCanvas {
    domElement: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    private vertexShader;
    private fragmentShader;
    private shaderProgram;
    constructor();
    setSize(width: number, height: number): void;
    render(): void;
}
