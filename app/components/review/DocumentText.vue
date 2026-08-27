<script lang="ts" setup>
import { useIntersectionObserver } from "@vueuse/core";
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

const scroller = useTemplateRef<HTMLElement>("scroller");
const sheets = useTemplateRef<HTMLElement[]>("sheets");

/**
 * Reports which page the reader is on, so the page rail can follow along.
 * The band stops just below the top edge, so the page the reader has scrolled
 * to counts rather than the one they are leaving behind.
 */
useIntersectionObserver(
    sheets,
    (entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        const page = Number(visible?.target.getAttribute("data-page"));
        if (page) {
            emit("visiblePage", page);
        }
    },
    { root: scroller, rootMargin: "0px 0px -75% 0px" }
);

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

</script>

<template>
    <div
        ref="scroller"
        class="h-full min-h-0 overflow-y-auto rounded-(--ui-radius) border border-default bg-elevated/40 p-6"
    >
        <div class="mx-auto flex w-full max-w-[880px] flex-col gap-6">
            <section
                v-for="page in props.slices"
                :id="`page-${page.start}`"
                ref="sheets"
                :key="page.page"
                :data-page="page.page"
                class="rounded-sm border border-default bg-default px-12 py-12 text-sm leading-relaxed shadow-[0_1px_3px_rgba(20,26,35,0.06),0_8px_24px_rgba(20,26,35,0.05)]"
            >
                <MDC
                    v-if="!isInteractive"
                    :value="redactedPage(page)"
                    class="prose prose-sm max-w-none"
                />

                <div v-else class="whitespace-pre-wrap break-words">
                    <template v-for="(part, index) in segmentsOf(page)" :key="index">
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
                    v-if="props.slices.length > 1"
                    class="mt-10 border-t border-default pt-3 text-center text-[0.65rem] uppercase tracking-wider text-dimmed"
                >
                    {{ t("review.page", { page: page.page }) }}
                </div>
            </section>
        </div>
    </div>
</template>
