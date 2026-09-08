import { describe, expect, it } from "vitest";
import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";
import { type DocumentSegment, segmentsOf } from "~/utils/documentSegments";

function detection(
    text: string,
    start: number,
    state: StoredDetection["state"] = "redacted",
): StoredDetection {
    return {
        id: `d-${start}`,
        documentId: "doc",
        label: "person",
        occurrenceIndex: 1,
        subjectIndex: 1,
        text,
        start,
        end: start + text.length,
        confidence: 0.9,
        state,
    };
}

function page(text: string, detections: StoredDetection[]): DocumentPage {
    return { page: 1, start: 0, end: text.length, text, detections };
}

describe("segmentsOf", () => {
    it("returns a single text segment for a page without detections", () => {
        expect(segmentsOf(page("hello world", []))).toEqual([
            { kind: "text", text: "hello world", start: 0, end: 11 },
        ]);
    });

    it("splits text and detections in document order", () => {
        const segments = segmentsOf(
            page("Alice and Bob", [
                detection("Alice", 0),
                detection("Bob", 10),
            ]),
        );

        expect(segments).toEqual<DocumentSegment[]>([
            {
                kind: "detection",
                text: "Alice",
                detection: detection("Alice", 0),
                start: 0,
                end: 5,
            },
            { kind: "text", text: " and ", start: 5, end: 10 },
            {
                kind: "detection",
                text: "Bob",
                detection: detection("Bob", 10),
                start: 10,
                end: 13,
            },
        ]);
    });

    it("skips a detection that overlaps the one before it", () => {
        const segments = segmentsOf(
            page("xy", [detection("xy", 0), detection("x", 0)]),
        );

        const covered = segments.map((s) => [s.start, s.end]);
        expect(covered).toEqual([[0, 2]]);
    });

    it("always tiles the page exactly once, with a trailing text segment", () => {
        const segments = segmentsOf(
            page("xy", [detection("x", 0), detection("y", 1)]),
        );

        const covered = segments.map((s) => [s.start, s.end]);
        expect(covered).toEqual([
            [0, 1],
            [1, 2],
        ]);
    });

    it("keeps an un-redacted detection as a segment too", () => {
        const segments = segmentsOf(
            page("Alice", [detection("Alice", 0, "unredacted")]),
        );

        expect(segments[0]).toMatchObject({
            kind: "detection",
            detection: expect.objectContaining({ state: "unredacted" }),
        });
    });
});
