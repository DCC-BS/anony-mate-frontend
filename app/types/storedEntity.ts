import { z } from "zod";

export const StoredEntityTypeSchema = z.object({
    /** Entity type name, as sent to the API. */
    name: z.string(),
    /**
     * What the type is called in the interface and in its replacement — the
     * proper German name, e.g. `AHV-Nummer` for the label `ahv-nummer`. Falls
     * back to the label where a type has none.
     */
    displayName: z.string().default(""),
    description: z.string(),
    /**
     * How a redacted mention is written, e.g. `{name}-{subject}`. Supports
     * `{name}`, `{label}`, `{subject}` (same value keeps its number) and
     * `{occurrence}`.
     */
    replacement: z.string().default("{name}-{subject}"),
    /** Built-in types come from the API presets and cannot be deleted. */
    builtin: z.boolean().default(false),
    /**
     * True once the user has edited a built-in type. Built-in descriptions are
     * refreshed from the API on every run — they are what the detection model
     * reads, so an improved one has to reach an existing browser — and this is
     * what keeps that refresh from overwriting the user's own wording.
     */
    customised: z.boolean().default(false),
});

export type StoredEntityType = z.infer<typeof StoredEntityTypeSchema>;

export const StoredEntityGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(""),
    /** Names of the entity types this group detects. */
    labels: z.array(z.string()).default([]),
    builtin: z.boolean().default(false),
});

export type StoredEntityGroup = z.infer<typeof StoredEntityGroupSchema>;

export const StoredBlacklistTermSchema = z.object({
    /** The term itself is the key: never-redact terms are unique. */
    term: z.string(),
    createdAt: z.coerce.date(),
});

export type StoredBlacklistTerm = z.infer<typeof StoredBlacklistTermSchema>;
