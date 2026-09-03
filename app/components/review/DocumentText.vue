<script lang="ts" setup>
import { useEventListener } from "@vueuse/core";
import type { DocumentPage } from "~/composables/useDocumentPages";
import type { DocumentView } from "~/composables/useDocumentReview";
import type { DetectionState, StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    /** The document as page slices, each with its own rebased detections. */
    slices: DocumentPage[];
    view: DocumentView;
    /** Preview only: write redactions as black bars instead of placeholders. */
    blackout?: boolean;
    selectedId?: string;
    /** Replacement template per entity type. */
    replacements: Record<string, string>;
    /** Entity types this document was detected with, for relabelling. */
    labels: string[];
    /** Marking mode: a selection becomes a detection, a click removes one. */
    marker?: boolean;
    /** Entity type a mark is filed under, and the colour the cursors take. */
    markerLabel?: string;
}>();
const emit = defineEmits<{
    /** The detection now under the ring, or nothing once it is let go. */
    select: [id: string | undefined];
    visiblePage: [page: number];
    setState: [id: string, state: DetectionState];
    setAllOccurrences: [text: string, state: DetectionState];
    relabel: [id: string, label: string];
    annotate: [start: number, end: number, text: string];
}>();

const { getEntityColor } = useEntityColor();
const { nib, eraser } = useMarkerCursor(
    () => getEntityColor(props.markerLabel ?? "").solid,
);
const { renderPage } = useDocumentExport();

const scroller = useTemplateRef<HTMLElement>("scroller");
const menu = useTemplateRef("menu");

const isEditing = computed(() => props.view === "editor");
const isNumbered = computed(() => props.slices.length > 1);

// Both renderings are the same document at different lengths, so the anchor
// has to survive the blackout toggle as well as the view itself.
useViewAnchor(scroller, () => `${props.view}:${props.blackout}`);

useMarkSelection(
    scroller,
    () => props.slices,
    () => props.marker,
    (start, end, text) => emit("annotate", start, end, text),
);

// Only the editor is ringed. The preview is the result as it will be handed on,
// and a ring on one word in it says something about the reader's cursor rather
// than about the document — it still carries its anchors, so a click in the
// list scrolls to the right place, it just arrives unmarked.
useSelectionMark(
    scroller,
    () => props.selectedId,
    isEditing,
    () => `${props.view}:${props.blackout}:${props.slices.length}`,
);

/** Reports which page the reader is on, so the page rail can follow along. */
function reportVisiblePage(): void {
    const root = scroller.value;
    if (!root) {
        return;
    }

    const top = root.getBoundingClientRect().top;
    for (const sheet of root.querySelectorAll<HTMLElement>("[data-page]")) {
        if (sheet.getBoundingClientRect().bottom > top) {
            emit("visiblePage", Number(sheet.dataset.page));
            return;
        }
    }
}

/** A page as it reads in the preview, rendered as markdown. */
function previewPage(page: DocumentPage): string {
    return renderPage(
        page,
        props.blackout ? "blacked" : "placeholder",
        props.replacements,
        { anchors: true },
    );
}

/** In marking mode a click on a detection takes it back out of the document. */
function onDetectionClick(detection: StoredDetection): void {
    if (props.marker) {
        emit("setState", detection.id, "unredacted");
        return;
    }

    // Clicking the selected one again lets go of it, so the reader can clear
    // the ring with the same click that set it.
    emit(
        "select",
        detection.id === props.selectedId ? undefined : detection.id,
    );
}

// Bound to the element rather than declared in the template: the pane is a
// scrolling surface, not a control, and giving it a click handler in markup
// would have it claim a role and keyboard behaviour it does not want.
useEventListener(scroller, "click", (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (props.selectedId && !target?.closest(".detection-mark")) {
        emit("select", undefined);
    }
});
</script>

<template>
    <div
        ref="scroller"
        class="h-full min-h-0 overflow-y-auto rounded-(--ui-radius) border border-default bg-elevated/40 p-6"
        @scroll="reportVisiblePage"
    >
        <div class="mx-auto flex w-full max-w-sheet flex-col gap-6">
            <ReviewDocumentSheet
                v-for="page in props.slices"
                :key="page.page"
                :page="page.page"
                :start="page.start"
                :numbered="isNumbered"
            >
                <ReviewEditablePage
                    v-if="isEditing"
                    :page="page"
                    :replacements="props.replacements"
                    :marker="props.marker"
                    :nib="nib"
                    :eraser="eraser"
                    @select="onDetectionClick"
                    @menu="(event, detection) => menu?.openAt(event, detection)"
                />

                <MDC
                    v-else
                    :value="previewPage(page)"
                    class="prose prose-sm max-w-none"
                />
            </ReviewDocumentSheet>
        </div>
    </div>

    <ReviewDetectionMenu
        ref="menu"
        :labels="props.labels"
        @relabel="(id, label) => emit('relabel', id, label)"
        @set-state="(id, state) => emit('setState', id, state)"
        @set-all-occurrences="(text, state) => emit('setAllOccurrences', text, state)"
    />
</template>

<style>
/* Unscoped: the ring is applied by hand to a mark that, in the preview, was
   rendered as markdown by another component and a scoped selector never
   reaches. It sits on the mark's own border rather than outside it — offset
   out from something this small reads as a second, looser box. */
.detection-mark.is-selected {
    outline: 2px solid var(--ui-primary);
    outline-offset: -1px;
}
</style>
