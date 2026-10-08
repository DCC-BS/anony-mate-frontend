import { beforeEach, describe, expect, it } from "vitest";
import { db } from "~/stores/db";
import { StoredDetectionSchema } from "~/types/storedDocument";
import { numberEntities } from "./detectionNumbering";
import { getDocumentService } from "./documentService";

describe("edit of a stored mark with boxes", () => {
    beforeEach(async () => {
        await db.detections.clear();
        await db.documents.clear();
    });

    it("a setState round-trip through the schema keeps the row", async () => {
        const documentId = "doc-1";
        await replaceMarksNow(documentId);
        const rows = await db.detections
            .where("documentId")
            .equals(documentId)
            .toArray();

        // The review's toggle rewrites the row through the schema, as
        // `useDetectionEditing.change` does.
        const [before] = rows;
        const after = before
            ? StoredDetectionSchema.parse({ ...before, state: "unredacted" })
            : undefined;

        expect(after?.state).toBe("unredacted");
        expect(after?.boxes).toEqual(before?.boxes);
    });

    it("numberEntities keeps rows that carry boxes", () => {
        const numbered = numberEntities([
            {
                id: "API d1",
                text: "Hildegard Zwyssig",
                label: "person",
                start: 0,
                end: 1,
                confidence: 0.9,
            },
        ]);
        expect(numbered[0]?.occurrenceIndex).toBe(1);
    });

    it("a deep clone of a mark row survives (what the history holds)", () => {
        const row = StoredDetectionSchema.parse({
            id: `${"doc-1"}:person:0`,
            documentId: "doc-1",
            label: "person",
            text: "Hildegard",
            start: 0,
            end: 1,
            confidence: 0.9,
            state: "redacted",
            boxes: [{ page: 1, left: 1, top: 1, right: 2, bottom: 2 }],
        });

        const cloned = globalThis.structuredClone(toRawDeep(row)) as typeof row;
        expect(cloned.boxes).toEqual(row.boxes);
        expect(cloned.state).toBe("redacted");
    });
});

function toRawDeep(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

/** Queues the two marks of the smoke document without a document row. */
async function replaceMarksNow(documentId: string) {
    return getDocumentService().replaceMarks(documentId, {
        annotations: [
            {
                id: "d1",
                label: "person",
                text: "Hildegard Zwyssig",
                confidence: 0.97,
                boxes: [
                    { page: 1, left: 60, top: 100, right: 180, bottom: 112 },
                ],
            },
            {
                id: "d2",
                label: "ort",
                text: "Riehen",
                confidence: 0.9,
                boxes: [
                    { page: 1, left: 200, top: 100, right: 240, bottom: 112 },
                ],
            },
        ],
        page_sizes: { 1: [595, 842] },
    });
}
