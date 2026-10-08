import { beforeEach, describe, expect, it } from "vitest";
import type { PdfAnnotationsResult } from "#shared/types/redactTypes";
import { db } from "~/stores/db";
import { getDocumentService } from "./documentService";

describe("replaceMarks", () => {
    beforeEach(async () => {
        await db.detections.clear();
        await db.documents.clear();
    });

    const documentId = "doc-1";

    /** A person, a place, then the person again — in the order found. */
    const result: PdfAnnotationsResult = {
        annotations: [
            {
                id: "d1",
                label: "person",
                text: "Hildegard Zwyssig",
                confidence: 0.97,
                boxes: [
                    { page: 1, left: 60, top: 100, right: 180, bottom: 112 },
                    { page: 1, left: 60, top: 118, right: 150, bottom: 130 },
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
            {
                id: "d3",
                label: "person",
                text: "Hildegard Zwyssig",
                confidence: 0.9,
                boxes: [
                    { page: 2, left: 60, top: 300, right: 180, bottom: 312 },
                ],
            },
        ],
        page_sizes: { 1: [595, 842], 2: [595, 842] },
    };

    it("stores one row per mark, redacted, with its boxes", async () => {
        const { replaceMarks } = getDocumentService();

        const count = await replaceMarks(documentId, result);

        expect(count).toBe(3);
        const rows = await db.detections
            .where("documentId")
            .equals(documentId)
            .sortBy("start");
        expect(rows.map((row) => row.text)).toEqual([
            "Hildegard Zwyssig",
            "Riehen",
            "Hildegard Zwyssig",
        ]);
        expect(rows.every((row) => row.state === "redacted")).toBe(true);
        expect(rows[0]?.boxes).toHaveLength(2);
        expect(rows[0]?.boxes?.[1]).toEqual({
            page: 1,
            left: 60,
            top: 118,
            right: 150,
            bottom: 130,
        });
    });

    it("gives every mention of the same text the same subject number", async () => {
        const { replaceMarks } = getDocumentService();
        await replaceMarks(documentId, result);

        const rows = await db.detections
            .where("documentId")
            .equals(documentId)
            .toArray();
        const people = rows.filter((row) => row.label === "person");
        const places = rows.filter((row) => row.label === "ort");

        expect(new Set(people.map((row) => row.subjectIndex))).toHaveLength(1);
        expect(places[0]?.subjectIndex).toBe(2);
    });

    it("keeps each mark's own id for the export to name the annotation", async () => {
        const { replaceMarks } = getDocumentService();
        await replaceMarks(documentId, result);

        const rows = await db.detections
            .where("documentId")
            .equals(documentId)
            .toArray();
        expect(rows.map((row) => row.id).sort()).toEqual(
            ["doc-1:person:0", "doc-1:person:2", "doc-1:ort:1"].sort(),
        );
    });

    it("replaces a previous run's marks wholesale", async () => {
        const { replaceMarks } = getDocumentService();
        await replaceMarks(documentId, result);

        const count = await replaceMarks(documentId, {
            annotations: [],
            page_sizes: {},
        });

        expect(count).toBe(0);
        expect(
            await db.detections.where("documentId").equals(documentId).count(),
        ).toBe(0);
    });
});
