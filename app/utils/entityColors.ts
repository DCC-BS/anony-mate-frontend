const PALETTE = [
    "primary",
    "secondary",
    "success",
    "info",
    "warning",
    "error",
] as const;

export type EntityColor = (typeof PALETTE)[number];

export function entityColor(name: string): EntityColor {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length] ?? "primary";
}
