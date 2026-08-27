import type { StoredDetection } from "~/types/storedDocument";

/** One page of a document: its own markdown, with detections rebased to it. */
export interface DocumentPage {
    page: number;
    start: number;
    end: number;
    /** Raw markdown of the page; detection offsets index into this. */
    text: string;
    /** Header of a table this page continues, if it starts mid-table. */
    tableHeader?: string;
    detections: StoredDetection[];
}

/**
 * Splits a converted document into pages and counts the detections on each.
 *
 * Docling reports page boundaries as character offsets into the text, so a
 * detection belongs to the last page that starts at or before its span.
 *
 * @param text - The full document text.
 * @param pageOffsets - Character offset each page starts at.
 * @param detections - The document's detections.
 * @returns The page slices, their offsets and per-page detection counts.
 */
export function useDocumentPages(
    text: MaybeRefOrGetter<string>,
    pageOffsets: MaybeRefOrGetter<number[]>,
    detections: MaybeRefOrGetter<StoredDetection[]>,
) {
    const offsets = computed(() => {
        const value = toValue(pageOffsets);
        return value.length > 0 ? value : [0];
    });

    const hasPages = computed(() => offsets.value.length > 1);

    const pages = computed(() =>
        offsets.value.map((start, index) => ({
            page: index + 1,
            start,
            end: offsets.value[index + 1] ?? toValue(text).length,
        })),
    );

    /** Page number a character offset falls on, 1-based. */
    function pageOf(offset: number): number {
        const index = offsets.value.findLastIndex((start) => start <= offset);
        return Math.max(1, index + 1);
    }

    /**
     * Each page as its own markdown, with the detections that fall on it
     * rebased to the slice. Rendering a slice is then independent of the rest
     * of the document, which matters for the redacted views: replacing a name
     * changes the text length and would shift every later page.
     *
     * The text stays exactly as converted so the offsets keep pointing at it;
     * a table cut by the page break is repaired at render time instead.
     */
    const slices = computed(() => {
        const full = toValue(text);
        const all = toValue(detections);

        return pages.value.map((page) => {
            return {
                ...page,
                text: full.slice(page.start, page.end),
                tableHeader: openTableHeader(full.slice(0, page.start)),
                detections: all
                    .filter(
                        (detection) =>
                            detection.start >= page.start &&
                            detection.start < page.end,
                    )
                    .map((detection) => ({
                        ...detection,
                        start: detection.start - page.start,
                        end: Math.min(detection.end, page.end) - page.start,
                    })),
            };
        });
    });

    const detectionCounts = computed(() => {
        const counts = offsets.value.map(() => 0);

        for (const detection of toValue(detections)) {
            const index = pageOf(detection.start) - 1;
            counts[index] = (counts[index] ?? 0) + 1;
        }

        return counts;
    });

    return { pages, slices, hasPages, pageOf, detectionCounts };
}
