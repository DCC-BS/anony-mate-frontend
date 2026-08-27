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

export const ConversionResultSchema = z.object({
    text: z.string(),
    page_offsets: z.array(z.int()).default([]),
});

export type Entity = z.infer<typeof EntitySchema>;
export type RedactResult = z.infer<typeof RedactResultSchema>;
export type RedactOptions = z.infer<typeof RedactOptionsSchema>;
export type ConversionResult = z.infer<typeof ConversionResultSchema>;

export const TaskAcceptedSchema = z.object({
    task_id: z.string(),
});

export const TaskStateSchema = z.object({
    task_id: z.string(),
    status: z.enum(["pending", "running", "finished", "failed"]),
    progress: z.number().nullable().optional(),
    resource_id: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
});

export type TaskState = z.infer<typeof TaskStateSchema>;
