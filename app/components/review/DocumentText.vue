<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";
import { useEventListener } from "@vueuse/core";
import type { DocumentPage } from "~/composables/useDocumentPages";
import type { DocumentView } from "~/composables/useDocumentReview";
import type { StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    /** The document as page slices, each with its own rebased detections. */
    slices: DocumentPage[];
    view: DocumentView;
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
    select: [id: string];
    visiblePage: [page: number];
    decide: [id: string, state: StoredDetection["state"]];
    decideAll: [text: string, state: StoredDetection["state"]];
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

useViewAnchor(scroller, () => props.view);

useMarkSelection(
    scroller,
    () => props.slices,
    () => props.marker,
    (start, end, text) => emit("annotate", start, end, text),
);

const menu = useDetectionMenu(
    () => props.labels,
    {
        relabel: (id, label) => emit("relabel", id, label),
        decide: (id, state) => emit("decide", id, state),
        decideAll: (text, state) => emit("decideAll", text, state),
    },
);

const isInteractive = computed(() => props.view === "original");

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

/** A page as it reads in the current result view, rendered as markdown. */
function redactedPage(page: DocumentPage): string {
    return renderPage(
        page,
        props.view === "blacked" ? "blacked" : "placeholder",
        props.replacements,
    );
}

/** In marking mode a click on a detection takes it back out of the document. */
function onDetectionClick(detection: StoredDetection): void {
    if (props.marker) {
        emit("decide", detection.id, "rejected");
        return;
    }

    emit("select", detection.id);
}

/**
 * How a detection reads in the document: accepted shows its replacement behind
 * a solid outline, open keeps the original words behind a dotted one. A
 * rejected one is not drawn at all — it has left the document.
 */
function detectionStyle(detection: StoredDetection) {
    const colour = getEntityColor(detection.label);

    return {
        background: colour.soft,
        borderColor: colour.solid,
        borderStyle: detection.state === "accepted" ? "solid" : "dotted",
    };
}

/** Accepted detections show their replacement instead of the original text. */
function detectionText(detection: StoredDetection, original: string): string {
    return detection.state === "accepted"
        ? replacementFor(detection, props.replacements[detection.label])
        : original;
}
</script>

<template>
    <div
        ref="scroller"
        class="h-full min-h-0 overflow-y-auto rounded-(--ui-radius) border border-default bg-elevated/40 p-6"
        @scroll="reportVisiblePage"
    >
        <div class="mx-auto flex w-full max-w-sheet flex-col gap-6">
            <section
                v-for="page in props.slices"
                :id="`page-${page.start}`"
                :key="page.page"
                :data-page="page.page"
                :data-page-start="page.start"
                class="rounded-sm border border-default bg-default px-12 py-12 text-sm leading-relaxed shadow-sheet"
            >
                <MDC
                    v-if="!isInteractive"
                    :value="redactedPage(page)"
                    class="prose prose-sm max-w-none"
                />

                <div
                    v-else
                    class="whitespace-pre-wrap break-words"
                    :style="props.marker ? { cursor: nib } : undefined"
                >
                    <template
                        v-for="(part, index) in segmentsOf(page)"
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
                            :class="[
                                'inline cursor-pointer rounded border px-0.5 text-left',
                                part.detection.state === 'rejected' && 'opacity-60',
                                part.detection.state === 'accepted' && 'font-mono text-redaction',
                                part.detection.id === props.selectedId && 'ring-2 ring-(--ui-primary)'
                            ]"
                            :style="[
                                detectionStyle(part.detection),
                                props.marker
                                    ? { cursor: eraser }
                                    : {}
                            ]"
                            :title="`${entityName(part.detection.label)} · ${Math.round(part.detection.confidence * 100)}%`"
                            @click="onDetectionClick(part.detection)"
                            @contextmenu.prevent="menu.openAt($event, part.detection)"
                        >{{ detectionText(part.detection, part.text) }}</button>
                    </template>
                </div>

                <div
                    v-if="props.slices.length > 1"
                    class="mt-10 border-t border-default pt-3 text-center text-eyebrow uppercase tracking-wider text-dimmed"
                >
                    {{ t("review.page", { page: page.page }) }}
                </div>
            </section>
        </div>
    </div>

    <!-- One menu for the whole document, placed where the reader clicked. -->
    <UDropdownMenu
        v-model:open="menu.open.value"
        :items="menu.items.value"
        :ui="{
            // Cap only a searchable list: the relabel submenu can carry every
            // entity type in the document, while the menu it opens from is
            // short and fixed and must not be cropped. The filter field is the
            // only thing that tells the two panels apart, and it sits outside
            // the viewport, so it stays put while the labels scroll.
            viewport:
                '[[data-slot=content]:has(input)>&]:max-h-40 [[data-slot=content]:has(input)>&]:overflow-y-auto'
        }"
    >
        <div
            class="fixed size-px"
            :style="{ left: `${menu.at.value.x}px`, top: `${menu.at.value.y}px` }"
        />

        <template #item-leading="{ item }">
            <EntityDot v-if="menu.labelOf(item)" :label="menu.labelOf(item)" />
        </template>
    </UDropdownMenu>
</template>
