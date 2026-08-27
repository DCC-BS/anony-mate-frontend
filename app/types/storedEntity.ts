import { z } from "zod";

export const StoredEntityTypeSchema = z.object({
    /** Entity type name, as sent to the API. */
    name: z.string(),
    description: z.string(),
    /**
     * How a redacted mention is written, e.g. `Person-{subject}`. Supports
     * `{label}`, `{subject}` (same value keeps its number) and `{occurrence}`.
     */
    replacement: z.string().default("{label}-{subject}"),
    /** Built-in types come from the API presets and cannot be deleted. */
    builtin: z.boolean().default(false),
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
