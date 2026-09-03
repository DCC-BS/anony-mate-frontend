import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";

/**
 * A run of the document: either plain text or one detection.
 *
 * `start` and `end` are offsets into the page's own text. They are carried
 * rather than derived, because what a segment renders is not always what the
 * document says: the preview shows a redacted detection's replacement instead
 * of the words it stands for.
 */
export type DocumentSegment = { start: number; end: number } & (
    | { kind: "text"; text: string }
    | { kind: "detection"; text: string; detection: StoredDetection }
);

/**
 * Splits one page into plain and detected segments. Detections are sorted and
 * any overlap is skipped, so the segments always tile the page exactly once.
 *
 * Un-redacted detections are segments too. The reader took the redaction off,
 * not the finding, so the words stay marked — outlined rather than filled — and
 * can be redacted again with one click.
 */
export function segmentsOf(page: DocumentPage): DocumentSegment[] {
    const segments: DocumentSegment[] = [];
    let cursor = 0;

    for (const detection of [...page.detections].sort(
        (a, b) => a.start - b.start,
    )) {
        if (detection.start < cursor) {
            continue;
        }

        if (detection.start > cursor) {
            segments.push({
                kind: "text",
                text: page.text.slice(cursor, detection.start),
                start: cursor,
                end: detection.start,
            });
        }

        segments.push({
            kind: "detection",
            text: page.text.slice(detection.start, detection.end),
            detection,
            start: detection.start,
            end: detection.end,
        });
        cursor = detection.end;
    }

    if (cursor < page.text.length) {
        segments.push({
            kind: "text",
            text: page.text.slice(cursor),
            start: cursor,
            end: page.text.length,
        });
    }

    return segments;
}
