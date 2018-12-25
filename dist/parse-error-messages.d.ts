export interface ShaderErrorMessage {
    text: string;
    lineNumber: number;
}
export declare function parseErrorMessages(msg: string, prefix: string): ShaderErrorMessage[];
