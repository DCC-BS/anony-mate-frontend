import z from "zod";

export type EntityTypePreset = "default" | "legal" | "full";

/**
 * One entity type as the API serves it: what it is called, and what it means.
 *
 * An API that predates display names serves the description on its own. It is
 * read as a type without a name, which the interface shows under its label, so
 * a frontend deployed ahead of its API loses the names rather than the presets.
 */
export const ApiEntityTypeSchema = z.union([
    z.object({
        /** The proper German name, shown in the interface, e.g. `AHV-Nummer`. */
        name: z.string(),
        /** What the label means, in the words the detection model reads. */
        description: z.string(),
    }),
    z.string().transform((description) => ({ name: "", description })),
]);

/** A preset: the entity types it detects, by label. */
export const ApiEntityPresetSchema = z.record(z.string(), ApiEntityTypeSchema);

export type ApiEntityType = z.infer<typeof ApiEntityTypeSchema>;
export type ApiEntityPreset = z.infer<typeof ApiEntityPresetSchema>;

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

/** One marked area of a page, in points from the top left. */
export const MarkBoxSchema = z.object({
    page: z.int().gte(1),
    left: z.number(),
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
});

/** One mark the API found on a PDF, as the interface draws it. */
export const MarkAnnotationSchema = z.object({
    /** The mark's id, kept as its annotation's /NM on the PDF. */
    id: z.string(),
    label: z.string(),
    /** What the mark covers; empty for a mark on a picture. */
    text: z.string(),
    confidence: z.number().gte(0).lte(1),
    boxes: z.array(MarkBoxSchema),
});

/** What a PDF scanned for redaction answers with, instead of the marked PDF. */
export const PdfAnnotationsResultSchema = z.object({
    annotations: z.array(MarkAnnotationSchema),
    /** Width and height of each page in points, by 1-based page number. */
    page_sizes: z.record(z.coerce.number(), z.tuple([z.number(), z.number()])),
});

export type Entity = z.infer<typeof EntitySchema>;
export type RedactResult = z.infer<typeof RedactResultSchema>;
export type RedactOptions = z.infer<typeof RedactOptionsSchema>;
export type DocumentRedactResult = z.infer<typeof DocumentRedactResultSchema>;
export type MarkBox = z.infer<typeof MarkBoxSchema>;
export type MarkAnnotation = z.infer<typeof MarkAnnotationSchema>;
export type PdfAnnotationsResult = z.infer<typeof PdfAnnotationsResultSchema>;

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
