<script lang="ts" setup>
import type { ReviewTool } from "~/composables/useDocumentReview";
import type { DetectionBox, DetectionState, StoredDetection, StoredDocument } from "~/types/storedDocument";

/**
 * Where pdf.js reads its decoders and fonts from; static app assets.
 *
 * Absolute: the worker fetches these itself, and inside a blob worker a
 * root-relative URL has no base to resolve against.
 */
const assetUrl = (path: string) => `${window.location.origin}${path}`;
const PDFJS_ASSETS = {
    wasm: assetUrl("/pdfjs/wasm/"),
    standardFonts: assetUrl("/pdfjs/standard_fonts/"),
    cmaps: assetUrl("/pdfjs/cmaps/"),
};

/** How one mark is drawn: its fill and the line around it. */
interface AnnotationStyle {
    fill: string;
    stroke: string;
}

const props = defineProps<{
    /** The document under review; its file is the PDF the marks stand on. */
    document: StoredDocument;
    detections: StoredDetection[];
    /** The detection under the ring, if any. */
    selectedId?: string;
    /** Entity types this document was detected with, for relabelling. */
    labels: string[];
    /** The tool in the reader's hand: only mark draws over the pages. */
    tool?: ReviewTool;
    /** Entity type the next rectangle is filed under, for its colour. */
    markerLabel?: string;
}>();
const emit = defineEmits<{
    select: [id: string | undefined];
    /** A rectangle the reader drew, as one box in points and the words it
     * covers, guessed from the page's text layer. */
    mark: [box: DetectionBox, text: string];
    setState: [id: string, state: DetectionState];
    setAllOccurrences: [text: string, state: DetectionState];
    relabel: [id: string, label: string];
    removeDetection: [id: string];
}>();

const viewer = useTemplateRef<{ focusAnnotation: (id: string) => void }>(
    "viewer",
);

/**
 * The original PDF as the file URL the viewer reads it from.
 *
 * The document row is re-read from IndexedDB on every change of it — the
 * confidence slider among them — and each read hands back the blob as a
 * fresh instance. Keying the URL on the blob's identity would reload the
 * whole document on every slider step; its name and size are the same
 * content there, and those only change when a different file really was
 * stored, which is the only time a reload is wanted.
 */
const fileUrl = ref<string>();
let currentUrl: string | undefined;
let currentKey: string | undefined;
watch(
    () => {
        const file = props.document.file;
        return file ? `${file instanceof File ? file.name : "pdf"}:${file.size}` : undefined;
    },
    (key) => {
        if (key === currentKey) {
            return;
        }
        currentKey = key;
        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = undefined;
        }
        const file = props.document.file;
        if (!file || !key) {
            fileUrl.value = undefined;
            return;
        }
        currentUrl = URL.createObjectURL(file);
        fileUrl.value = currentUrl;
    },
    { immediate: true },
);
onUnmounted(() => {
    if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
    }
});

const { getEntityColor } = useEntityColor();
const { entityName } = useEntityName();

/**
 * How a mark is drawn over the page: its type's colour, filled where the
 * reader keeps the redaction, and where they have set it aside a hatch of
 * the plain paper showing through — a redaction that is not one reads as
 * crossed out, not as absent. Dashed on a picture, which covers no text.
 * The reader already looking at it is ringed in primary.
 */
function styleFor(
    annotation: { key: string },
    active: boolean,
): AnnotationStyle {
    const detection = props.detections.find((item) => item.id === annotation.key);
    const color = getEntityColor(detection?.label ?? "").solid;
    const redacted = detection?.state !== "unredacted";

    // The selection only widens the border: what the mark's state is stays
    // visible under the ring — active + redacted keeps its hatch, active +
    // un-redacted stays open — and the type's colour holds its ground
    // against the primary.
    if (!redacted) {
        return {
            fill: "transparent",
            stroke: active ? "var(--ui-primary)" : color,
        };
    }
    return {
        fill: `repeating-linear-gradient(135deg, transparent, transparent 3px, color-mix(in oklch, ${color} 33%, transparent) 3px, color-mix(in oklch, ${color} 33%, transparent) 5px)`,
        stroke: active ? "var(--ui-primary)" : color,
    };
}

interface PdfAnnotationLike {
    key: string;
    boxes: { page: number; left: number; top: number; right: number; bottom: number }[];
    page?: number | null;
    title?: string;
    dashed?: boolean;
}

/** The marks as the viewer draws them: one annotation per detection. */
const annotations = computed<PdfAnnotationLike[]>(() =>
    props.detections
        .filter((detection) => detection.boxes?.length)
        .map((detection) => ({
            key: detection.id,
            boxes: detection.boxes ?? [],
            page: detection.boxes?.[0]?.page ?? null,
            title: markTitle(detection),
            // Dashed means the API found something that carries no words —
            // a mark on a picture. A mark the reader drew by hand covers
            // ground they saw, so it reads as the redaction it is.
            dashed: !detection.text && !detection.manual,
        })),
);

function markTitle(detection: StoredDetection): string {
    const name = entityName(detection.label);
    const confidence = Math.round(detection.confidence * 100);
    return detection.text
        ? `${name} · ${confidence} % · «${detection.text}»`
        : `${name} · ${confidence} %`;
}

/** A click in the sidebar highlights and brings the mark into view. */
watch(
    () => props.selectedId,
    (id) => {
        if (id) {
            viewer.value?.focusAnnotation(id);
        }
    },
);

function onActivate(key: string): void {
    // The eraser takes the mark out at once, as a click does in the text
    // review; the ring toggle is the select tool's move.
    if (props.tool === "erase") {
        emit("removeDetection", key);
        return;
    }
    emit("select", key === props.selectedId ? undefined : key);
}

// ---------------------------------------------------------------------------
// Marking: a rectangle the reader draws over the page, as one box in points
// ---------------------------------------------------------------------------

/** A drag too small to be meant as a rectangle is a click instead. */
const CLICK_TOLERANCE = 3;

/** Spans whose tops sit this close together are one line of text. */
const LINE_TOLERANCE = 6;

/**
 * The drawn rectangle, in px within the page, as plain state.
 *
 * The preview is written to its element by hand: a slot's content renders in
 * the viewer's own render, and a reactive draft here updated the ref but not
 * the page's DOM. The rectangle lives for the length of one drag, so the
 * machinery it needs is a style string, not a render.
 */
let draft: { left: number; top: number; width: number; height: number } | null = null;

/**
 * The preview element per page: every page renders its own, so one template
 * ref would hold only the page that mounted last and leave every other drag
 * without a visible rectangle.
 */
const draftEls = new Map<number, HTMLElement>();

function setDraftEl(page: number, el: unknown): void {
    if (el instanceof HTMLElement) {
        draftEls.set(page, el);
    } else {
        draftEls.delete(page);
    }
}

function drawDraft(): void {
    const el = draft && draftEls.get(draw?.page ?? 0);
    if (!el || !draft) {
        return;
    }
    el.style.left = `${draft.left}px`;
    el.style.top = `${draft.top}px`;
    el.style.width = `${draft.width}px`;
    el.style.height = `${draft.height}px`;
    el.classList.remove("hidden");
}

function clearDraft(): void {
    draft = null;
    for (const el of draftEls.values()) {
        el.classList.add("hidden");
    }
}

/** Where the drag began, the page it is on, and how that page was laid out. */
let draw: {
    page: number;
    x: number;
    y: number;
    rectWidth: number;
    rectHeight: number;
    /** The page's element, for reading the text layer under the rectangle. */
    pageEl: HTMLElement;
    /** The page's real size in points, which the box is scaled into. */
    pageSize: { width: number; height: number };
} | null = null;

function onDrawStart(event: PointerEvent, page: number): void {
    // Without the page's real size there is nothing to scale the rectangle
    // into; the drag does not start rather than drawing against a
    // fabricated page.
    const pageSize = props.document.pageSizes?.[page];
    if (!pageSize) {
        return;
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // The overlay's parent is the page div the viewer laid out.
    const pageEl = target.parentElement as HTMLElement;
    draw = {
        page,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height,
        pageEl,
        pageSize,
    };
    // The drag belongs to the rectangle even when the pointer leaves the
    // page; where it ends up is clamped to the page at the end.
    target.setPointerCapture(event.pointerId);
    draft = { left: draw.x, top: draw.y, width: 0, height: 0 };
    drawDraft();
}

function onDrawMove(event: PointerEvent): void {
    if (!draw) {
        return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    draft = {
        left: Math.min(draw.x, x),
        top: Math.min(draw.y, y),
        width: Math.abs(x - draw.x),
        height: Math.abs(y - draw.y),
    };
    drawDraft();
}

function onDrawEnd(): void {
    const state = draw;
    draw = null;
    const rect = draft;
    clearDraft();
    if (!state || !rect) {
        return;
    }

    // A click (no real drag) picks the mark under the pointer, as clicking a
    // detection does in the text review; on empty paper it does nothing.
    if (rect.width < CLICK_TOLERANCE && rect.height < CLICK_TOLERANCE) {
        const point = boxInPoints(state, state.x, state.y, state.x, state.y);
        const hit = [...props.detections]
            .reverse()
            .find((detection) =>
                detection.boxes?.some(
                    (box) =>
                        box.page === state.page &&
                        point.left >= box.left &&
                        point.left <= box.right &&
                        point.top >= box.top &&
                        point.top <= box.bottom,
                ),
            );
        if (hit) {
            emit("select", hit.id);
        }
        return;
    }

    const box = boxInPoints(
        state,
        rect.left,
        rect.top,
        rect.left + rect.width,
        rect.top + rect.height,
    );
    emit("mark", box, guessText(state.pageEl, rect));
}

/**
 * The words the rectangle covers, from the page's text layer.
 *
 * The layer's spans sit exactly where the page's words are, but a span can
 * carry a whole line or paragraph, so the guess goes down to the words: each
 * span's text is measured word by word with a DOM range — the browser knows
 * every glyph's position — and a word belongs to the mark when the rectangle
 * covers at least half of it in both axes. The words are read in reading
 * order, lines stacked by height, which feeds the mark's numbering, its
 * sidebar row and the placeholder written on the export.
 */
function guessText(
    pageEl: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
): string {
    const pageRect = pageEl.getBoundingClientRect();
    const box = {
        left: rect.left,
        top: rect.top,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
    };

    const words: { top: number; left: number; text: string }[] = [];
    for (const span of pageEl.querySelectorAll(".textLayer span")) {
        const spanRect = span.getBoundingClientRect();
        if (
            spanRect.left - pageRect.left > box.right ||
            spanRect.right - pageRect.left < box.left ||
            spanRect.top - pageRect.top > box.bottom ||
            spanRect.bottom - pageRect.top < box.top
        ) {
            continue;
        }
        collectWords(span, pageRect, box, words);
    }

    // Lines are words whose tops sit together; the sort walks down the page
    // and, within a line, left to right.
    words.sort((a, b) =>
        Math.abs(a.top - b.top) > LINE_TOLERANCE
            ? a.top - b.top
            : a.left - b.left,
    );

    const lines: string[] = [];
    let line: string[] = [];
    let lineTop = Number.NaN;
    for (const word of words) {
        if (Math.abs(word.top - lineTop) > LINE_TOLERANCE) {
            if (line.length) {
                lines.push(line.join(" "));
            }
            line = [];
            lineTop = word.top;
        }
        line.push(word.text);
    }
    if (line.length) {
        lines.push(line.join(" "));
    }
    return lines.join("\n");
}

/** A word is in when the rectangle covers half of it, in both axes. */
function coversHalfOf(
    wordRect: DOMRect,
    box: { left: number; top: number; right: number; bottom: number },
): boolean {
    const overlapX =
        Math.min(wordRect.right, box.right) - Math.max(wordRect.left, box.left);
    const overlapY =
        Math.min(wordRect.bottom, box.bottom) - Math.max(wordRect.top, box.top);
    return (
        overlapX >= wordRect.width / 2 && overlapY >= wordRect.height / 2
    );
}

/** Measures a span's words against the rectangle, gathering those it covers. */
function collectWords(
    span: Element,
    pageRect: DOMRect,
    box: { left: number; top: number; right: number; bottom: number },
    words: { top: number; left: number; text: string }[],
): void {
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!(node instanceof Text)) {
            continue;
        }
        for (const match of node.data.matchAll(/\S+/g)) {
            const wordRange = document.createRange();
            wordRange.setStart(node, match.index);
            wordRange.setEnd(node, match.index + match[0].length);
            for (const wordRect of wordRange.getClientRects()) {
                // Range rects live in viewport space; the box and the rest of
                // the guess live in the page's own.
                const local = new DOMRect(
                    wordRect.left - pageRect.left,
                    wordRect.top - pageRect.top,
                    wordRect.width,
                    wordRect.height,
                );
                if (!coversHalfOf(local, box)) {
                    continue;
                }
                words.push({
                    left: local.left,
                    top: local.top,
                    text: match[0],
                });
                break;
            }
        }
    }
}

function onDrawCancel(): void {
    draw = null;
    clearDraft();
}

/**
 * A rectangle from px within the rendered page into page points, clamped to
 * the page. The rendered page keeps the page's aspect ratio, so one scale
 * per axis takes the whole box across. The size is the one the drag started
 * with: a drag never begins against a page without one.
 */
function boxInPoints(
    state: {
        page: number;
        rectWidth: number;
        rectHeight: number;
        pageSize: { width: number; height: number };
    },
    left: number,
    top: number,
    right: number,
    bottom: number,
): DetectionBox {
    const scaleX = state.pageSize.width / state.rectWidth;
    const scaleY = state.pageSize.height / state.rectHeight;
    return {
        page: state.page,
        left: Math.max(0, Math.min(left, right) * scaleX),
        top: Math.max(0, Math.min(top, bottom) * scaleY),
        right: Math.min(state.pageSize.width, Math.max(left, right) * scaleX),
        bottom: Math.min(
            state.pageSize.height,
            Math.max(top, bottom) * scaleY,
        ),
    };
}

/** The draft's look: the ink of the type the mark will be filed under. */
const draftStyle = computed(() => {
    const color = getEntityColor(props.markerLabel ?? "").solid;
    return {
        borderColor: color,
        backgroundColor: `color-mix(in oklch, ${color} 25%, transparent)`,
    };
});

const { eraser } = useMarkerCursor(computed(() => props.markerLabel ?? ""));

/**
 * The mark's context menu: one for the whole document, opened on right
 * click at the box, with the review's whole repertoire on the one mark —
 * and on every occurrence of its text, since a scan rarely shows a name
 * once. The component owns its open state; it is opened through its
 * exposed `openAt`.
 */
const menu = useTemplateRef<{ openAt: (event: MouseEvent, detection: StoredDetection) => void }>(
    "menu",
);

function onContextMenu(key: string, x: number, y: number): void {
    const detection = props.detections.find((item) => item.id === key);
    if (!detection) {
        return;
    }
    // The menu works on the mark under the pointer; ring it, so the menu's
    // entries read as its own.
    emit("select", key);
    menu.value?.openAt(new MouseEvent("contextmenu", { clientX: x, clientY: y }), detection);
}
</script>

<template>
    <PdfViewer
        v-if="fileUrl"
        ref="viewer"
        class="review-pdf-viewer h-full min-h-0 rounded-(--ui-radius) border border-default bg-elevated/40"
        :class="{ 'erase-tool': props.tool === 'erase' }"
        :style="{ '--eraser-cursor': eraser }"
        :file-url="fileUrl"
        :annotations="annotations"
        :active-key="props.selectedId ?? null"
        :style-for="styleFor"
        :wasm-url="PDFJS_ASSETS.wasm"
        :standard-font-data-url="PDFJS_ASSETS.standardFonts"
        :c-map-url="PDFJS_ASSETS.cmaps"
        @activate="onActivate"
        @contextmenu="onContextMenu"
    >
        <!-- One overlay per page, only in the mark tool's hand: it takes the
             pointer so a drag draws rather than lands on the marks under it,
             and it is gone entirely in the other tools, where the marks keep
             their clicks and context menus. -->
        <template #page="{ page }">
            <div
                v-if="props.tool === 'mark'"
                class="absolute inset-0 cursor-crosshair touch-none"
                @pointerdown="onDrawStart($event, page)"
                @pointermove="onDrawMove"
                @pointerup="onDrawEnd"
                @pointercancel="onDrawCancel"
            >
                <!-- The preview is positioned by hand as the drag runs; the
                     ink is the type's, from the picker. -->
                <div
                    :ref="(el) => setDraftEl(page, el)"
                    class="absolute hidden border-2"
                    :style="draftStyle"
                />
            </div>
        </template>
    </PdfViewer>

    <ReviewDetectionMenu
        ref="menu"
        :labels="props.labels"
        @relabel="(id, label) => emit('relabel', id, label)"
        @set-state="(id, state) => emit('setState', id, state)"
        @set-all-occurrences="(text, state) => emit('setAllOccurrences', text, state)"
        @remove-detection="(id) => emit('removeDetection', id)"
    />
</template>

<style scoped>
/* The eraser over a mark says what a click will do, as in the text review.
   The marks are the viewer's own buttons, so the cursor reaches them through
   the custom property rather than a style prop. */
.review-pdf-viewer.erase-tool :deep([data-page] > button) {
    cursor: var(--eraser-cursor);
}
</style>