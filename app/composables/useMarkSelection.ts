import { useEventListener } from "@vueuse/core";
import type { DocumentPage } from "~/composables/useDocumentPages";

/**
 * Turns what the reader selects into a span of the document.
 *
 * Counting rendered characters would be wrong: an accepted detection shows its
 * replacement, which is rarely as long as the words it stands for, so every
 * offset after one would be out by the difference. Each segment carries its
 * true offsets instead, and the marked words are read back out of the document
 * rather than off the page.
 *
 * @param scroller - The pane to watch for a finished selection.
 * @param slices - The document's pages, to read the real text from.
 * @param enabled - Whether marking is on.
 * @param onMark - Called with the document offsets and the words they hold.
 */
export function useMarkSelection(
    scroller: Ref<HTMLElement | null>,
    slices: MaybeRefOrGetter<DocumentPage[]>,
    enabled: MaybeRefOrGetter<boolean | undefined>,
    onMark: (start: number, end: number, text: string) => void,
) {
    useEventListener(scroller, "mouseup", () => mark());

    function mark(): void {
        if (!toValue(enabled)) {
            return;
        }

        const selection = window.getSelection();
        const range = selection?.rangeCount
            ? selection.getRangeAt(0)
            : undefined;
        if (!range || range.collapsed) {
            return;
        }

        const from = offsetAt(range.startContainer, range.startOffset, "start");
        const to = offsetAt(range.endContainer, range.endOffset, "end");

        // A selection running across two pages has no single set of offsets.
        if (!from || !to || from.page !== to.page || to.offset <= from.offset) {
            return;
        }

        const page = toValue(slices).find(
            (slice) => slice.start === Number(from.page.dataset.pageStart),
        );
        if (!page) {
            return;
        }

        const raw = page.text.slice(from.offset, to.offset);
        const text = raw.trim();
        if (!text) {
            return;
        }

        const start =
            page.start + from.offset + (raw.length - raw.trimStart().length);
        onMark(start, start + text.length, text);
        selection?.removeAllRanges();
    }
}

/** The element a selection endpoint sits in, whether it landed in text or not. */
function elementOf(node: Node): HTMLElement | null {
    return node.nodeType === Node.TEXT_NODE
        ? node.parentElement
        : (node as HTMLElement);
}

/**
 * Where a selection endpoint falls in the page's own text.
 *
 * A detection contributes only its edges, because nothing inside it can be
 * addressed by what is on screen.
 */
function offsetAt(
    container: Node,
    offset: number,
    side: "start" | "end",
): { page: HTMLElement; offset: number } | undefined {
    const segment = elementOf(container)?.closest<HTMLElement>("[data-offset]");
    const page = segment?.closest<HTMLElement>("[data-page-start]");
    if (!segment || !page) {
        return undefined;
    }

    const from = Number(segment.dataset.offset);
    const to = segment.dataset.end;

    return {
        page,
        offset: to ? (side === "start" ? from : Number(to)) : from + offset,
    };
}
