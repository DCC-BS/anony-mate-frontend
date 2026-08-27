import { Dexie, type EntityTable } from "dexie";
import type { StoredDetection, StoredDocument } from "~/types/storedDocument";
import type {
    StoredBlacklistTerm,
    StoredEntityGroup,
    StoredEntityType,
} from "~/types/storedEntity";

/**
 * Browser-side store for documents and their detections.
 *
 * The API keeps no state: everything needed to show progress, or to resume
 * after a reload, is held here.
 */
export const db = new Dexie("anonymate-db") as Dexie & {
    documents: EntityTable<StoredDocument, "id">;
    detections: EntityTable<StoredDetection, "id">;
    entityTypes: EntityTable<StoredEntityType, "name">;
    entityGroups: EntityTable<StoredEntityGroup, "id">;
    blacklist: EntityTable<StoredBlacklistTerm, "term">;
};

db.version(1).stores({
    documents: "id, status, name, createdAt, updatedAt",
    detections: "id, documentId, label, state",
});

db.version(2).stores({
    documents: "id, status, name, createdAt, updatedAt",
    detections: "id, documentId, label, state",
    entityTypes: "name, builtin",
    entityGroups: "id, name, builtin",
    blacklist: "term, createdAt",
});

db.version(3)
    .stores({
        documents: "id, status, name, createdAt, updatedAt",
        detections: "id, documentId, label, state",
        entityTypes: "name, builtin",
        entityGroups: "id, name, builtin",
        blacklist: "term, createdAt",
    })
    .upgrade(async (tx) => {
        // Detections gained occurrenceIndex/subjectIndex; number the existing
        // ones the same way new results are numbered, per document and label.
        const detections = await tx.table("detections").toArray();
        const byDocumentAndLabel = new Map<string, StoredDetection[]>();

        for (const detection of detections) {
            const key = `${detection.documentId}:${detection.label}`;
            byDocumentAndLabel.set(key, [
                ...(byDocumentAndLabel.get(key) ?? []),
                detection,
            ]);
        }

        const renumbered = [...byDocumentAndLabel.values()].flatMap((group) => {
            const subjectNumbers = new Map<string, number>();

            return [...group]
                .sort((a, b) => a.start - b.start)
                .map((detection, index) => {
                    const value = detection.text.trim().toLowerCase();
                    if (!subjectNumbers.has(value)) {
                        subjectNumbers.set(value, subjectNumbers.size + 1);
                    }

                    return {
                        ...detection,
                        occurrenceIndex: index + 1,
                        subjectIndex: subjectNumbers.get(value) as number,
                    };
                });
        });

        await tx.table("detections").bulkPut(renumbered);

        // Entity types gained a replacement template.
        await tx
            .table("entityTypes")
            .toCollection()
            .modify((type) => {
                if (!type.replacement) {
                    const name = String(type.name);
                    type.replacement = `${name.charAt(0).toUpperCase()}${name.slice(1)}-{subject}`;
                }
            });
    });
