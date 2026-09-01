<script lang="ts" setup>
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
}>();
const emit = defineEmits<{
    select: [id: string];
    visiblePage: [page: number];
    decide: [id: string, state: StoredDetection["state"]];
    decideAll: [text: string, state: StoredDetection["state"]];
}>();

const { t } = useI18n();
const { getEntityColor } = useEntityColor();

const { renderPage } = useDocumentExport();
const { blocks, estimateBlock } = useDocumentBlocks(() => props.slices);

const scroller = useTemplateRef<{
    virtualizer?: {
        scrollOffset: number | null;
        getVirtualItems: () => { index: number; end: number }[];
    };
}>("scroller");

/**
 * Reports which page the reader is on, so the page rail can follow along.
 *
 * Taken from the virtualiser's own offset rather than the first mounted
 * block: it mounts a few blocks either side of the viewport, so the topmost
 * one is usually still above it.
 */
function reportVisiblePage(): void {
    const virtualizer = scroller.value?.virtualizer;
    if (!virtualizer) {
        return;
    }

    const offset = virtualizer.scrollOffset ?? 0;
    const mounted = virtualizer.getVirtualItems();
    const visible = mounted.find((item) => item.end > offset) ?? mounted[0];
    const page = blocks.value[visible?.index ?? -1]?.page;

    if (page) {
        emit("visiblePage", page);
    }
}

const isInteractive = computed(() => props.view === "original");

/** A page as it reads in the current result view, rendered as markdown. */
function redactedPage(page: DocumentPage): string {
    return renderPage(
        page,
        props.view === "blacked" ? "blacked" : "placeholder",
        props.replacements
    );
}

function menuItems(detection: StoredDetection) {
    return [
        [
            {
                label: t("review.accept"),
                icon: "i-lucide-check",
                onSelect: () => emit("decide", detection.id, "accepted")
            },
            {
                label: t("review.reject"),
                icon: "i-lucide-x",
                onSelect: () => emit("decide", detection.id, "rejected")
            }
        ],
        [
            {
                label: t("review.acceptAllOccurrencesShort"),
                icon: "i-lucide-check-check",
                onSelect: () => emit("decideAll", detection.text, "accepted")
            },
            {
                label: t("review.rejectAllOccurrencesShort"),
                icon: "i-lucide-x-circle",
                onSelect: () => emit("decideAll", detection.text, "rejected")
            }
        ]
    ];
}

/**
 * How a detection reads in the document:
 * open      — original text, dotted outline, still to decide
 * accepted  — its replacement, solid outline in the entity colour
 * rejected  — original text, faint tint, no outline: seen, kept visible
 */
function detectionStyle(detection: StoredDetection) {
    const colour = getEntityColor(detection.label);

    if (detection.state === "accepted") {
        return {
            background: colour.soft,
            borderColor: colour.solid,
            borderStyle: "solid"
        };
    }

    if (detection.state === "rejected") {
        return {
            background: colour.soft,
            borderColor: "transparent",
            borderStyle: "solid"
        };
    }

    return {
        background: colour.soft,
        borderColor: colour.solid,
        borderStyle: "dotted"
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
    <!-- The redacted views carry no interactive elements, so they stay one
         rendered page each; only the reviewable view needs virtualising. -->
    <div
        v-if="!isInteractive"
        class="h-full min-h-0 overflow-y-auto rounded-(--ui-radius) border border-default bg-elevated/40 p-6"
        @scroll="reportVisiblePage"
    >
        <div class="mx-auto flex w-full max-w-[880px] flex-col gap-6">
            <section
                v-for="page in props.slices"
                :id="`page-${page.start}`"
                :key="page.page"
                :data-page="page.page"
                class="rounded-sm border border-default bg-default px-12 py-12 text-sm leading-relaxed shadow-[0_1px_3px_rgba(20,26,35,0.06),0_8px_24px_rgba(20,26,35,0.05)]"
            >
                <MDC :value="redactedPage(page)" class="prose prose-sm max-w-none" />

                <div
                    v-if="props.slices.length > 1"
                    class="mt-10 border-t border-default pt-3 text-center text-[0.65rem] uppercase tracking-wider text-dimmed"
                >
                    {{ t("review.page", { page: page.page }) }}
                </div>
            </section>
        </div>
    </div>

    <UScrollArea
        v-else
        ref="scroller"
        :items="blocks"
        :virtualize="{ estimateSize: estimateBlock, overscan: 4 }"
        class="h-full min-h-0 rounded-(--ui-radius) border border-default bg-elevated/40"
        @scroll="reportVisiblePage"
    >
        <template #default="{ item }">
            <!-- The page sheet is drawn per block: only some of a page is
                 mounted, so its border is carried by the blocks that hold its
                 edges and continued by the ones in between. -->
            <div
                class="mx-auto w-full max-w-[928px] px-6"
                :class="[item.firstOfDocument && 'pt-6', item.lastOfDocument && 'pb-6']"
            >
                <div
                    :id="`page-${item.page}`"
                    :data-page="item.page"
                    class="border-x border-default bg-default px-12 text-sm leading-relaxed"
                    :class="[
                        item.first && 'rounded-t-sm border-t pt-12',
                        item.endsPage && 'rounded-b-sm border-b pb-12',
                        item.endsPage && !item.lastOfDocument && 'mb-6'
                    ]"
                >
                    <div class="whitespace-pre-wrap break-words">
                        <template v-for="(part, index) in item.segments" :key="index">
                            <span v-if="part.kind === 'text'">{{ part.text }}</span>

                            <UContextMenu v-else :items="menuItems(part.detection)">
                                <button
                                    :id="`detection-${part.detection.id}`"
                                    type="button"
                                    :class="[
                                        'inline cursor-pointer rounded border px-0.5 text-left',
                                        part.detection.state === 'rejected' && 'opacity-60',
                                        part.detection.state === 'accepted' && 'font-mono text-[0.9em]',
                                        part.detection.id === props.selectedId && 'ring-2 ring-(--ui-primary)'
                                    ]"
                                    :style="detectionStyle(part.detection)"
                                    :title="`${part.detection.label} · ${Math.round(part.detection.confidence * 100)}%`"
                                    @click="emit('select', part.detection.id)"
                                >{{ detectionText(part.detection, part.text) }}</button>
                            </UContextMenu>
                        </template>
                    </div>

                    <div
                        v-if="item.endsPage && props.slices.length > 1"
                        class="mt-10 border-t border-default pt-3 text-center text-[0.65rem] uppercase tracking-wider text-dimmed"
                    >
                        {{ t("review.page", { page: item.page }) }}
                    </div>
                </div>
            </div>
        </template>
    </UScrollArea>
</template>
