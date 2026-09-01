import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";

/** A run of the document: either plain text or one detection. */
export type DocumentSegment =
    | { kind: "text"; text: string }
    | { kind: "detection"; text: string; detection: StoredDetection };

/**
 * Splits one page into plain and detected segments. Detections are sorted and
 * any overlap is skipped, so the segments always tile the page exactly once.
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
            });
        }

        segments.push({
            kind: "detection",
            text: page.text.slice(detection.start, detection.end),
            detection,
        });
        cursor = detection.end;
    }

    if (cursor < page.text.length) {
        segments.push({ kind: "text", text: page.text.slice(cursor) });
    }

    return segments;
}
