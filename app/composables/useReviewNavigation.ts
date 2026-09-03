import type { StoredDetection } from "~/types/storedDocument";

/**
 * Where the reader is in the document, and how they get somewhere else.
 *
 * @param detections - The detections the review is showing.
 * @param pageOffsets - Character offset each page starts at.
 * @param pageOf - Which page a character offset falls on.
 * @returns The current selection and page, and the ways to move them.
 */
export function useReviewNavigation(
    detections: MaybeRefOrGetter<StoredDetection[]>,
    pageOffsets: MaybeRefOrGetter<number[]>,
    pageOf: (offset: number) => number,
) {
    /** The detection under the ring, if any. */
    const selectedId = ref<string>();
    /** The page under the top edge of the pane, 1-based. */
    const activePage = ref(1);

    /** Scrolls the document pane to the start of a page. */
    function goToPage(page: number): void {
        const offset = toValue(pageOffsets)[page - 1];
        if (offset === undefined) {
            return;
        }

        activePage.value = page;
        document
            .getElementById(`page-${offset}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /**
     * Selects a detection and follows it in the page rail.
     *
     * Clicking a detection in the document does not move the document: the
     * reader is already looking at it, and scrolling it to the middle of the
     * pane pulls the page out from under them. Only a click from a list, where
     * the detection is somewhere off screen, brings it into view.
     *
     * @param id - The detection to select, or nothing to let go of it.
     * @param reveal - Whether to bring it into view as well.
     */
    async function selectDetection(
        id: string | undefined,
        reveal = false,
    ): Promise<void> {
        selectedId.value = id;
        if (!id) {
            return;
        }

        const detection = toValue(detections).find((item) => item.id === id);
        if (detection) {
            activePage.value = pageOf(detection.start);
        }

        if (!reveal) {
            return;
        }

        // The preview writes its detections as markdown and renders them after
        // the view switches, so the element may not be there on the first look.
        await nextTick();
        document
            .getElementById(`detection-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return { selectedId, activePage, goToPage, selectDetection };
}
