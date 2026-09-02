import z from "zod";

export type EntityTypePreset = "default" | "legal" | "full";

/** One entity type as the API serves it: what it is called, and what it means. */
export const ApiEntityTypeSchema = z.object({
    /** The proper German name, shown in the interface, e.g. `AHV-Nummer`. */
    name: z.string(),
    /** What the label means, in the words the detection model reads. */
    description: z.string(),
});

export type ApiEntityType = z.infer<typeof ApiEntityTypeSchema>;

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

/** A document converted and redacted in one submission. */
export const DocumentRedactResultSchema = z.object({
    /** The converted document, before redaction. */
    text: z.string(),
    page_offsets: z.array(z.int()).default([]),
    /** `text` with every detection written as its placeholder. */
    redacted_text: z.string(),
    entities: z.record(z.string(), z.array(EntitySchema)),
});

export type Entity = z.infer<typeof EntitySchema>;
export type RedactResult = z.infer<typeof RedactResultSchema>;
export type RedactOptions = z.infer<typeof RedactOptionsSchema>;
export type DocumentRedactResult = z.infer<typeof DocumentRedactResultSchema>;

export const TaskAcceptedSchema = z.object({
    task_id: z.string(),
});

export const TaskStateSchema = z.object({
    task_id: z.string(),
    status: z.enum(["pending", "running", "finished", "failed"]),
    progress: z.number().nullable().optional(),
    queue_position: z.number().nullable().optional(),
    resource_id: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
});

export type TaskState = z.infer<typeof TaskStateSchema>;
