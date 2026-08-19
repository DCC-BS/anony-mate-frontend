import z from "zod";

export type EntityTypePreset = "default" | "legal";

export const EntitySchema = z.object({
    id: z.string(),
    text: z.string(),
    label: z.string(),
    start: z.int(),
    end: z.int(),
    confidence: z.float32().gte(0).lte(1),
});

export const RedactResultSchema = z.object({
    text: z.string(),
    entities: z.record(z.string(), z.array(EntitySchema)),
});

export const RedactOptionsSchema = z.object({
    text: z.string(),
    entity_types: z.union([
        z.array(z.string()),
        z.record(z.string(), z.string()),
    ]),
    threshold: z.float32().gte(0).lte(1).optional(),
    blacklist: z.array(z.string()).optional(),
});

export type Entity = z.infer<typeof EntitySchema>;
export type RedactResult = z.infer<typeof RedactResultSchema>;
export type RedactOptions = z.infer<typeof RedactOptionsSchema>;
