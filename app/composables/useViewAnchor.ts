import type { DocumentView } from "~/composables/useDocumentReview";

/** About a second at 60Hz: long enough for a view to render, short enough
 *  that a view which never settles does not hold the reader. */
const FRAMES_AWAITING_LAYOUT = 60;

/**
 * Keeps the reader in place when the document is redrawn in another view.
 *
 * The views render the same document at different lengths, so a scroll offset
 * does not carry over. What does carry over is the page under the top edge and
 * how far into it the reader had come.
 *
 * @param scroller - The scrolling pane holding the pages.
 * @param view - The view being switched between.
 */
export function useViewAnchor(
    scroller: Ref<HTMLElement | null>,
    view: MaybeRefOrGetter<DocumentView>,
) {
    const anchor = ref<{ page: number; fraction: number }>();

    /** Where the reader is now, as a page and how far into it. */
    function currentAnchor(): { page: number; fraction: number } | undefined {
        const root = scroller.value;
        if (!root) {
            return undefined;
        }

        const top = root.getBoundingClientRect().top;
        for (const sheet of root.querySelectorAll<HTMLElement>("[data-page]")) {
            const box = sheet.getBoundingClientRect();
            if (box.bottom > top) {
                return {
                    page: Number(sheet.dataset.page),
                    fraction: Math.min(
                        1,
                        Math.max(0, (top - box.top) / box.height),
                    ),
                };
            }
        }

        return undefined;
    }

    /**
     * Waits for the pane to stop growing, then puts the anchor back under the
     * top edge.
     *
     * The redacted views render their markdown asynchronously. Until it
     * arrives the pane is shorter than it will be, and the browser clamps the
     * scroll position to that smaller height. The frame budget bounds the wait
     * for a view that never settles.
     */
    async function restoreAnchor(): Promise<void> {
        const target = anchor.value;
        const root = scroller.value;
        if (!root || !target) {
            return;
        }

        let previous = -1;
        for (
            let frame = 0;
            frame < FRAMES_AWAITING_LAYOUT && root.scrollHeight !== previous;
            frame++
        ) {
            previous = root.scrollHeight;
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        const sheet = root.querySelector<HTMLElement>(
            `[data-page="${target.page}"]`,
        );
        if (!sheet) {
            return;
        }

        const box = sheet.getBoundingClientRect();
        root.scrollTop +=
            box.top -
            root.getBoundingClientRect().top +
            box.height * target.fraction;
    }

    watch(
        () => toValue(view),
        () => {
            anchor.value = currentAnchor();
        },
        { flush: "pre" },
    );

    watch(() => toValue(view), restoreAnchor, { flush: "post" });
}
