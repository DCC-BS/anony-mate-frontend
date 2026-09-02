import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";

/**
 * A run of the document: either plain text or one detection.
 *
 * `start` and `end` are offsets into the page's own text. They are carried
 * rather than derived, because what a segment renders is not always what the
 * document says: an accepted detection shows its replacement instead of the
 * words it stands for.
 */
export type DocumentSegment = { start: number; end: number } & (
    | { kind: "text"; text: string }
    | { kind: "detection"; text: string; detection: StoredDetection }
);

/**
 * Splits one page into plain and detected segments. Detections are sorted and
 * any overlap is skipped, so the segments always tile the page exactly once.
 *
 * A rejected detection is one the reader has decided is not a mention, so its
 * words read as ordinary text again rather than staying marked up.
 */
export function segmentsOf(page: DocumentPage): DocumentSegment[] {
    const segments: DocumentSegment[] = [];
    let cursor = 0;

    const shown = page.detections.filter(
        (detection) => detection.state !== "rejected",
    );

    for (const detection of [...shown].sort((a, b) => a.start - b.start)) {
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
