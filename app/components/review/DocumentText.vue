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

const scroller = useTemplateRef<{ $el: HTMLElement }>("scroller");

/**
 * Reports which page the reader is on, so the page rail can follow along.
 *
 * Read from the mounted blocks rather than an observer over page sections:
 * only the blocks near the viewport exist, so there is nothing to observe for
 * the rest of the document.
 */
function reportVisiblePage(): void {
    const root = scroller.value?.$el;
    if (!root) {
        return;
    }

    const top = root.getBoundingClientRect().top;
    for (const element of root.querySelectorAll<HTMLElement>("[data-page]")) {
        if (element.getBoundingClientRect().bottom > top) {
            const page = Number(element.dataset.page);
            if (page) {
                emit("visiblePage", page);
            }
            return;
        }
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

/** Right-click actions for one detection. */
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

/** Characters a block may hold before the next paragraph starts a new one. */
const BLOCK_CHARS = 1200;

/**
 * Splits one page into plain and detected segments. Detections are sorted and
 * any overlap is skipped, so the segments always tile the page exactly once.
 */
function segmentsOf(page: DocumentPage) {
    const parts: (
        | { kind: "text"; text: string }
        | { kind: "detection"; text: string; detection: StoredDetection }
    )[] = [];

    let cursor = 0;
    for (const detection of [...page.detections].sort((a, b) => a.start - b.start)) {
        if (detection.start < cursor) {
            continue; // overlaps the previous detection
        }

        if (detection.start > cursor) {
            parts.push({ kind: "text", text: page.text.slice(cursor, detection.start) });
        }

        parts.push({
            kind: "detection",
            text: page.text.slice(detection.start, detection.end),
            detection
        });
        cursor = detection.end;
    }

    if (cursor < page.text.length) {
        parts.push({ kind: "text", text: page.text.slice(cursor) });
    }

    return parts;
}

type Segment = ReturnType<typeof segmentsOf>[number];

interface Block {
    id: string;
    page: number;
    /** True for the first block of a page, which carries the sheet's top edge. */
    first: boolean;
    /** True for the last block of a page, which carries the page footer. */
    endsPage: boolean;
    parts: Segment[];
}

/**
 * The document as blocks the virtualiser can mount one at a time.
 *
 * A whole document is far too much to keep in the DOM: every detection is an
 * interactive element, so a few thousand of them stall the page before it can
 * be read. Blocks break at paragraph boundaries wherever the document has
 * them, so the text still flows exactly as it did; a paragraph longer than
 * `BLOCK_CHARS` is split at a segment boundary rather than kept whole, which
 * is what makes a single-paragraph document virtualisable at all.
 */
const blocks = computed<Block[]>(() => {
    const result: Block[] = [];

    for (const page of props.slices) {
        let parts: Segment[] = [];
        let size = 0;
        let blocksOnPage = 0;

        const flush = (endsPage: boolean) => {
            if (parts.length || endsPage) {
                result.push({
                    id: `${page.page}:${result.length}`,
                    page: page.page,
                    first: blocksOnPage === 0,
                    endsPage,
                    parts,
                });
                blocksOnPage += 1;
                parts = [];
                size = 0;
            }
        };

        for (const part of segmentsOf(page)) {
            parts.push(part);
            size += part.text.length;

            const breaks = part.kind === "text" && part.text.includes("\n");
            if (size >= BLOCK_CHARS && breaks) {
                flush(false);
            } else if (size >= BLOCK_CHARS * 3) {
                // No paragraph break in sight; split anyway rather than let one
                // block grow back into the whole document.
                flush(false);
            }
        }

        flush(true);
    }

    return result;
});

/** Rough block height, so the scrollbar is about right before measuring. */
function estimateBlock(index: number): number {
    const block = blocks.value[index];
    if (!block) {
        return 260;
    }
    const chars = block.parts.reduce((total, part) => total + part.text.length, 0);
    // ~90 characters per rendered line at this width, ~22px per line.
    return Math.max(48, Math.ceil(chars / 90) * 22 + (block.endsPage ? 60 : 0));
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
            <div class="mx-auto w-full max-w-[880px] px-6">
                <div
                    :id="`page-${item.page}`"
                    :data-page="item.page"
                    class="bg-default px-12 text-sm leading-relaxed"
                    :class="[item.first && 'rounded-t-sm pt-12', item.endsPage && 'rounded-b-sm pb-12']"
                >
                    <div class="whitespace-pre-wrap break-words">
                        <template v-for="(part, index) in item.parts" :key="index">
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
