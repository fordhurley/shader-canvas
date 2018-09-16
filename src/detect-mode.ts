export type SourceMode = "detect" | "prefixed-without-uniforms" | "legacy" | "bare";

export function detectMode(source: string): SourceMode {
    if (/precision \w+ float;/g.test(source)) {
        // They are declaring precision, so they probably know what they are doing:
        return "bare";
    }

    const uniformNames = /(iResolution|iMouse|iGlobalTime|u_resolution|u_mouse|u_time)/g;
    const uniformDeclaration = new RegExp("uniform \\w+ " + uniformNames.source + ";", "g");

    if (uniformNames.test(source) && !uniformDeclaration.test(source)) {
        // Uniforms are used, but not declared, so the user expects us to declare them:
        return "legacy";
    }

    return "prefixed-without-uniforms";
}
