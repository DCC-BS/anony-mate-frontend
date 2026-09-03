import { z } from "zod";

/**
 * Where a document stands in the client-owned pipeline. The API is stateless,
 * so this status is the only record of progress and it lives in IndexedDB.
 */
export const DocumentStatusSchema = z.enum([
    "staged", // queued, nothing sent yet
    "converting", // uploaded file is at docling
    "redacting", // text is at the redact endpoint
    "ready", // detections stored, waiting for review
    "failed",
]);

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const StoredDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: DocumentStatusSchema,
    /** Source text; set directly for pasted text, filled by conversion for files. */
    text: z.string().default(""),
    /** Character offset each page starts at; empty for text without pages. */
    pageOffsets: z.array(z.number()).default([]),
    /** Original upload, kept until conversion succeeds so a reload can retry it. */
    file: z.instanceof(Blob).optional(),
    /** Entity types and threshold this document was queued with. */
    entityTypes: z.record(z.string(), z.string()),
    /** Detection group the entity types came from, so it can be swapped. */
    entityGroupId: z.string().default(""),
    /** Name of that group, kept so the list can show it without a lookup. */
    entityGroupName: z.string().default(""),
    /** Confidence the API was asked for; nothing below it was ever detected. */
    threshold: z.number().gte(0).lte(1),
    /**
     * Confidence the review shows, raised by hand from the document. Kept
     * apart from `threshold` so raising it cannot narrow what a later
     * re-detection asks the API for — lowering it again would then have
     * nothing to bring back. Absent until the reader moves the slider.
     */
    reviewThreshold: z.number().gte(0).lte(1).optional(),
    blacklist: z.array(z.string()).default([]),
    redactedText: z.string().optional(),
    detectionCount: z.number().default(0),
    errorMessage: z.string().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type StoredDocument = z.infer<typeof StoredDocumentSchema>;

/** What a caller has to supply to queue a document; the rest is defaulted. */
export type NewDocument = Omit<
    z.input<typeof StoredDocumentSchema>,
    "id" | "createdAt" | "updatedAt"
>;

/**
 * What a review can decide about one occurrence. There is no undecided state:
 * a detection is either taken out of the document or left in it.
 */
export const DetectionStateSchema = z.enum(["redacted", "unredacted"]);

export type DetectionState = z.infer<typeof DetectionStateSchema>;

export const StoredDetectionSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    label: z.string(),
    /** Position of this occurrence among all detections of the label, 1-based. */
    occurrenceIndex: z.number().default(1),
    /**
     * Number of the distinct value within the label, 1-based. Every mention of
     * the same text shares it, so one person keeps one number throughout.
     */
    subjectIndex: z.number().default(1),
    text: z.string(),
    start: z.number(),
    end: z.number(),
    confidence: z.number(),
    /**
     * Whether this occurrence is taken out of the document. Detections start
     * redacted — nothing is revealed until a reader says so — and un-redacting
     * one puts its original words back into the result.
     */
    state: DetectionStateSchema.default("redacted"),
});

export type StoredDetection = z.infer<typeof StoredDetectionSchema>;
