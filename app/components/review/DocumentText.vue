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

const { t } = useI18n();
const { getEntityColor } = useEntityColor();
const { entityName } = useEntityName();
const { nib, eraser } = useMarkerCursor(
    () => getEntityColor(props.markerLabel ?? "").solid,
);

const { renderPage } = useDocumentExport();

const scroller = useTemplateRef<HTMLElement>("scroller");
const menu = useTemplateRef("menu");

// Both renderings are the same document at different lengths, so the anchor
// has to survive the blackout toggle as well as the view itself.
useViewAnchor(scroller, () => `${props.view}:${props.blackout}`);

useMarkSelection(
    scroller,
    () => props.slices,
    () => props.marker,
    (start, end, text) => emit("annotate", start, end, text),
);

const isEditing = computed(() => props.view === "editor");

/**
 * The pages of the editable view, each already broken into its runs and each
 * run already carrying how it is drawn.
 *
 * Built once per change rather than in the template: a document carries
 * thousands of runs, and working out a colour and a tooltip for every one of
 * them on every redraw is what a reader feels as a stutter.
 */
const editablePages = computed(() =>
    props.slices.map((page) => ({
        page: page.page,
        start: page.start,
        segments: segmentsOf(page).map((segment) =>
            segment.kind === "detection"
                ? { ...segment, ...presentationOf(segment.detection) }
                : segment,
        ),
    })),
);

/** How one detection is drawn and what its tooltip says. */
function presentationOf(detection: StoredDetection) {
    const colour = getEntityColor(detection.label);
    const isRedacted = detection.state === "redacted";
    const replacement = replacementFor(
        detection,
        props.replacements[detection.label],
    );

    return {
        // Redacted reads as taken out — filled, solid outline. Un-redacted
        // keeps the outline, dotted and empty, so the reader can still see the
        // detection is there and put it back.
        style: {
            background: isRedacted ? colour.soft : "transparent",
            borderColor: colour.solid,
            borderStyle: isRedacted ? "solid" : "dotted",
        },
        title: isRedacted
            ? `${entityName(detection.label)} · ${Math.round(detection.confidence * 100)}% · ${replacement}`
            : `${entityName(detection.label)} · ${Math.round(detection.confidence * 100)}%`,
    };
}

/**
 * Reports which page the reader is on, so the page rail can follow along.
 */
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

/**
 * Marks the selected detection by hand rather than by binding a class to it.
 *
 * The selection changes on every click in the sidebar, and a binding would
 * make Vue walk every detection in the document to move one ring.
 *
 * Only the editor is marked. The preview is the result as it will be handed
 * on, and a ring on one word in it says something about the reader's cursor
 * rather than about the document. The preview still carries its anchors, so a
 * click in the list scrolls to the right place — it just arrives unmarked.
 */
watch(
    [() => props.selectedId, () => props.view, () => props.slices],
    async ([id]) => {
        await nextTick();
        const root = scroller.value;
        if (!root) {
            return;
        }

        for (const marked of root.querySelectorAll(".is-selected")) {
            marked.classList.remove("is-selected");
        }

        if (id && isEditing.value) {
            root.querySelector(
                `[id="detection-${CSS.escape(id)}"]`,
            )?.classList.add("is-selected");
        }
    },
);
</script>

<template>
    <div
        ref="scroller"
        class="h-full min-h-0 overflow-y-auto rounded-(--ui-radius) border border-default bg-elevated/40 p-6"
        @scroll="reportVisiblePage"
    >
        <div class="mx-auto flex w-full max-w-sheet flex-col gap-6">
            <template v-if="isEditing">
                <section
                    v-for="page in editablePages"
                    :id="`page-${page.start}`"
                    :key="page.page"
                    :data-page="page.page"
                    :data-page-start="page.start"
                    class="rounded-sm border border-default bg-default px-12 py-12 text-sm leading-relaxed shadow-sheet"
                >
                    <div
                        class="whitespace-pre-wrap break-words"
                        :style="props.marker ? { cursor: nib } : undefined"
                    >
                        <template
                            v-for="(part, index) in page.segments"
                            :key="index"
                        >
                            <span
                                v-if="part.kind === 'text'"
                                :data-offset="part.start"
                            >{{ part.text }}</span>

                            <button
                                v-else
                                :id="`detection-${part.detection.id}`"
                                type="button"
                                :data-offset="part.start"
                                :data-end="part.end"
                                class="detection-mark inline cursor-pointer rounded border px-0.5 text-left leading-tight"
                                :style="[
                                    part.style,
                                    props.marker ? { cursor: eraser } : {}
                                ]"
                                :title="part.title"
                                @click="onDetectionClick(part.detection)"
                                @contextmenu.prevent="menu?.openAt($event, part.detection)"
                            >{{ part.text }}</button>
                        </template>
                    </div>

                    <div
                        v-if="props.slices.length > 1"
                        class="mt-10 border-t border-default pt-3 text-center text-eyebrow uppercase tracking-wider text-dimmed"
                    >
                        {{ t("review.page", { page: page.page }) }}
                    </div>
                </section>
            </template>

            <template v-else>
                <section
                    v-for="page in props.slices"
                    :id="`page-${page.start}`"
                    :key="page.page"
                    :data-page="page.page"
                    :data-page-start="page.start"
                    class="rounded-sm border border-default bg-default px-12 py-12 text-sm leading-relaxed shadow-sheet"
                >
                    <MDC
                        :value="previewPage(page)"
                        class="prose prose-sm max-w-none"
                    />

                    <div
                        v-if="props.slices.length > 1"
                        class="mt-10 border-t border-default pt-3 text-center text-eyebrow uppercase tracking-wider text-dimmed"
                    >
                        {{ t("review.page", { page: page.page }) }}
                    </div>
                </section>
            </template>
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

<style scoped>
/* Applied by hand rather than bound, so selecting one detection does not
   redraw the thousands around it.

   The ring sits on the border itself rather than around it: offset out from a
   mark this small reads as a second, looser box floating off the words, and
   the outline already follows the mark's own corners. */
.detection-mark.is-selected {
    outline: 2px solid var(--ui-primary);
    outline-offset: -1px;
}
</style>
