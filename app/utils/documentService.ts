import { v4 as uuidv4 } from "uuid";
import { db } from "~/stores/db";
import {
    type NewDocument,
    type StoredDetection,
    StoredDetectionSchema,
    type StoredDocument,
    StoredDocumentSchema,
} from "~/types/storedDocument";

/**
 * Persistence layer for documents and detections on top of IndexedDB.
 *
 * @returns The document service operations.
 */
export function getDocumentService() {
    /**
     * Lists all stored documents, newest first.
     */
    function getDocuments(): Promise<StoredDocument[]> {
        return db.documents.orderBy("createdAt").reverse().toArray();
    }

    /**
     * Looks up a single document.
     */
    function getDocument(id: string): Promise<StoredDocument | undefined> {
        return db.documents.get(id);
    }

    /**
     * Queues a document for processing.
     *
     * @param document - Fields to store; id and timestamps are generated.
     * @returns The stored document.
     */
    async function addDocument(document: NewDocument): Promise<StoredDocument> {
        const now = new Date();
        const newDocument = StoredDocumentSchema.parse({
            ...document,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
        });

        await db.documents.add(newDocument);
        return newDocument;
    }

    /**
     * Applies a partial update and refreshes `updatedAt`.
     */
    async function updateDocument(
        id: string,
        updates: Partial<StoredDocument>,
    ): Promise<void> {
        // `.partial()` keeps the schema defaults, so parsing an update would
        // add `text: ""` and `blacklist: []` for the fields it does not carry
        // and overwrite the stored values. Keep only the fields passed in.
        const validated = StoredDocumentSchema.partial().parse(updates);
        const changed = Object.fromEntries(
            Object.entries(validated).filter(([key]) => key in updates),
        );

        await db.documents.update(id, { ...changed, updatedAt: new Date() });
    }

    /**
     * Deletes a document together with its detections.
     */
    async function deleteDocument(id: string): Promise<void> {
        await db.transaction("rw", [db.documents, db.detections], async () => {
            await db.detections.where("documentId").equals(id).delete();
            await db.documents.delete(id);
        });
    }

    /**
     * Lists the detections of a document.
     */
    function getDetections(documentId: string): Promise<StoredDetection[]> {
        return db.detections.where("documentId").equals(documentId).toArray();
    }

    /**
     * Replaces the detections of a document with a fresh redaction result.
     *
     * Blacklisted matches are dropped here rather than server-side, so a term
     * added to the never-redact list takes effect without asking the API again.
     */
    async function replaceDetections(
        documentId: string,
        entities: Record<string, Entity[]>,
        blacklist: string[] = [],
    ): Promise<number> {
        const terms = blacklist
            .map((term) => term.trim().toLowerCase())
            .filter(Boolean);
        const isBlacklisted = (entity: Entity) =>
            terms.some((term) => entity.text.toLowerCase().includes(term));

        const detections = Object.entries(entities).flatMap(([label, items]) =>
            // Tidy and filter first: a dropped span must not consume a number.
            numberEntities(
                items
                    .filter((entity) => !isBlacklisted(entity))
                    .flatMap((entity) => tidyEntitySpan(entity) ?? []),
            ).map((entity) =>
                StoredDetectionSchema.parse({
                    id: `${documentId}:${label}:${entity.start}`,
                    documentId,
                    label,
                    occurrenceIndex: entity.occurrenceIndex,
                    subjectIndex: entity.subjectIndex,
                    text: entity.text,
                    start: entity.start,
                    end: entity.end,
                    confidence: entity.confidence,
                    state: "redacted",
                }),
            ),
        );

        await db.transaction("rw", db.detections, async () => {
            await db.detections.where("documentId").equals(documentId).delete();
            await db.detections.bulkAdd(detections);
        });

        return detections.length;
    }

    /**
     * Deletes documents untouched for longer than the retention period.
     *
     * @returns How many documents were removed.
     */
    async function cleanupOldDocuments(): Promise<number> {
        const retentionDays = useRuntimeConfig().public.documentRetentionDays;
        const threshold = new Date(
            Date.now() - retentionDays * 24 * 60 * 60 * 1000,
        );
        const stale = await db.documents
            .where("updatedAt")
            .below(threshold)
            .toArray();

        for (const document of stale) {
            await deleteDocument(document.id);
        }

        return stale.length;
    }

    return {
        getDocuments,
        getDocument,
        addDocument,
        updateDocument,
        deleteDocument,
        getDetections,
        replaceDetections,
        cleanupOldDocuments,
    };
}
