/** Class the marked element carries; the styling lives with the marks. */
const MARK_CLASS = "is-selected";

/**
 * Rings the selected detection by hand rather than by binding a class to it.
 *
 * The selection changes on every click in the sidebar, and a binding would make
 * Vue walk every detection in the document to move one ring — on a document
 * with thousands of them, that is a redraw the reader can feel.
 *
 * @param root - The pane the detections are rendered in.
 * @param selectedId - The detection to ring, if any.
 * @param enabled - Whether to ring anything at all; the preview does not.
 * @param redrawsOn - Values whose change re-renders the pane, so the ring has
 *   to be put back afterwards.
 */
export function useSelectionMark(
    root: Ref<HTMLElement | null>,
    selectedId: MaybeRefOrGetter<string | undefined>,
    enabled: MaybeRefOrGetter<boolean>,
    redrawsOn: MaybeRefOrGetter<unknown>,
) {
    watch(
        [
            () => toValue(selectedId),
            () => toValue(enabled),
            () => toValue(redrawsOn),
        ],
        async ([id, isEnabled]) => {
            await nextTick();
            const pane = root.value;
            if (!pane) {
                return;
            }

            for (const marked of pane.querySelectorAll(`.${MARK_CLASS}`)) {
                marked.classList.remove(MARK_CLASS);
            }

            if (id && isEnabled) {
                pane.querySelector(
                    `[id="detection-${CSS.escape(id)}"]`,
                )?.classList.add(MARK_CLASS);
            }
        },
    );
}
