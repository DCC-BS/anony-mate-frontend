import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";

/** A run of the document: either plain text or one detection. */
export type DocumentSegment =
    | { kind: "text"; text: string }
    | { kind: "detection"; text: string; detection: StoredDetection };

export interface DocumentBlock {
    id: string;
    page: number;
    /** Carries the sheet's top edge, and its bottom edge and page footer. */
    first: boolean;
    endsPage: boolean;
    /** Outermost blocks, which carry the padding around the sheet. */
    firstOfDocument: boolean;
    lastOfDocument: boolean;
    segments: DocumentSegment[];
}

/** Characters a block may hold before the next paragraph starts a new one. */
const BLOCK_CHARS = 1200;

/**
 * Characters a single unbroken paragraph may reach before it is split anyway.
 *
 * A block boundary is a line break: the browser cannot flow text from one
 * absolutely positioned box into the next. Splitting only at the document's
 * own paragraph breaks therefore leaves the text exactly as it reads, so the
 * limit sits far above any real paragraph and exists only so that a document
 * written as one enormous line still mounts in pieces rather than whole.
 */
const UNBROKEN_CHARS = 12000;

/** Characters that fit on a rendered line, and the height of one. */
const LINE_CHARS = 90;
const LINE_HEIGHT = 22;

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

/**
 * The document as blocks a virtualiser can mount one at a time.
 *
 * A whole document is far too much to keep in the DOM: every detection is an
 * interactive element, so a few thousand of them stall the page before it can
 * be read. Blocks end where the document's own paragraphs end, so the text
 * still flows exactly as it did.
 *
 * @param slices - The document's pages, each with its rebased detections.
 * @returns The blocks and a height estimate for the virtualiser.
 */
export function useDocumentBlocks(slices: MaybeRefOrGetter<DocumentPage[]>) {
    const blocks = computed<DocumentBlock[]>(() => {
        const result: DocumentBlock[] = [];

        for (const page of toValue(slices)) {
            let segments: DocumentSegment[] = [];
            let size = 0;
            let onPage = 0;

            const flush = (endsPage: boolean) => {
                if (!segments.length && !endsPage) {
                    return;
                }

                result.push({
                    id: `${page.page}:${onPage}`,
                    page: page.page,
                    first: onPage === 0,
                    endsPage,
                    firstOfDocument: false,
                    lastOfDocument: false,
                    segments,
                });
                onPage += 1;
                segments = [];
                size = 0;
            };

            for (const segment of segmentsOf(page)) {
                segments.push(segment);
                size += segment.text.length;

                const endsParagraph =
                    segment.kind === "text" && segment.text.endsWith("\n");
                if (size >= BLOCK_CHARS && endsParagraph) {
                    flush(false);
                } else if (size >= UNBROKEN_CHARS) {
                    flush(false);
                }
            }

            flush(true);
        }

        const first = result.at(0);
        const last = result.at(-1);
        if (first && last) {
            first.firstOfDocument = true;
            last.lastOfDocument = true;
        }

        return result;
    });

    /** Height before a block has been rendered, so the scrollbar starts right. */
    function estimateBlock(index: number): number {
        const block = blocks.value[index];
        if (!block) {
            return LINE_HEIGHT * 12;
        }

        const chars = block.segments.reduce(
            (total, segment) => total + segment.text.length,
            0,
        );
        const lines = Math.ceil(chars / LINE_CHARS) * LINE_HEIGHT;

        return Math.max(48, lines + (block.endsPage ? 60 : 0));
    }

    return { blocks, estimateBlock };
}
