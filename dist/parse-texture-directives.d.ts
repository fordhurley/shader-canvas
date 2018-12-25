export interface TextureDirective {
    textureID: string;
    filePath: string;
}
export declare function parseTextureDirectives(source: string): {
    [textureID: string]: TextureDirective;
};
