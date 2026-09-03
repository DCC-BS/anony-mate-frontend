/** How a redaction is written into the result. */
export interface RedactionStyleOption {
    /** True for black bars, false for the entity type's placeholder. */
    blacked: boolean;
    /** Key its name and example are translated under. */
    key: "placeholder" | "blacked";
}

/**
 * The two ways a redaction can read, in the order they are offered.
 *
 * Shared so the toolbar and the export menu cannot drift apart: they are one
 * setting, and a reader who picks in either place must see the same two names.
 */
export const REDACTION_STYLES: readonly RedactionStyleOption[] = [
    { blacked: false, key: "placeholder" },
    { blacked: true, key: "blacked" },
];
