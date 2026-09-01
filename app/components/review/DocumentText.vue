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

const scroller = useTemplateRef<HTMLElement>("scroller");

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

/**
 * Keeps the reader in place when they switch between the views.
 *
 * The views render the same document at different lengths, so the scroll
 * offset does not carry over. The page under the top edge does, together with
 * how far into it the reader had come.
 */
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
                fraction: Math.min(1, Math.max(0, (top - box.top) / box.height)),
            };
        }
    }

    return undefined;
}

/**
 * Waits for the pane to stop growing, then puts the anchor back under the top
 * edge.
 *
 * The redacted views render their markdown asynchronously. Until it arrives
 * the pane is shorter than it will be, and the browser clamps the scroll
 * position to that smaller height — which is how the reader's place is lost
 * on the way in, but not on the way back to a view that renders at once.
 */
async function restoreAnchor(): Promise<void> {
    const target = anchor.value;
    const root = scroller.value;
    if (!root || !target) {
        return;
    }

    let previous = -1;
    for (let frame = 0; frame < 60 && root.scrollHeight !== previous; frame++) {
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
        box.top - root.getBoundingClientRect().top + box.height * target.fraction;
}

watch(
    () => props.view,
    () => {
        anchor.value = currentAnchor();
    },
    { flush: "pre" },
);

watch(() => props.view, restoreAnchor, { flush: "post" });

const isInteractive = computed(() => props.view === "original");

/** A page as it reads in the current result view, rendered as markdown. */
function redactedPage(page: DocumentPage): string {
    return renderPage(
        page,
        props.view === "blacked" ? "blacked" : "placeholder",
        props.replacements,
    );
}

/**
 * The detection whose menu is open, and where to anchor it.
 *
 * One menu serves the whole document. A menu component per detection means
 * thousands of component instances, which is what made a large document slow
 * to open and to scroll; the elements themselves are cheap.
 */
const menuOpen = ref(false);
const menuTarget = ref<StoredDetection>();
const menuAt = ref({ x: 0, y: 0 });

function openMenu(event: MouseEvent, detection: StoredDetection): void {
    menuTarget.value = detection;
    menuAt.value = { x: event.clientX, y: event.clientY };
    menuOpen.value = true;
}

function menuItems(detection: StoredDetection) {
    return [
        [
            {
                label: t("review.accept"),
                icon: "i-lucide-check",
                onSelect: () => emit("decide", detection.id, "accepted"),
            },
            {
                label: t("review.reject"),
                icon: "i-lucide-x",
                onSelect: () => emit("decide", detection.id, "rejected"),
            },
        ],
        [
            {
                label: t("review.acceptAllOccurrencesShort"),
                icon: "i-lucide-check-check",
                onSelect: () => emit("decideAll", detection.text, "accepted"),
            },
            {
                label: t("review.rejectAllOccurrencesShort"),
                icon: "i-lucide-x-circle",
                onSelect: () => emit("decideAll", detection.text, "rejected"),
            },
        ],
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
            borderStyle: "solid",
        };
    }

    if (detection.state === "rejected") {
        return {
            background: colour.soft,
            borderColor: "transparent",
            borderStyle: "solid",
        };
    }

    return {
        background: colour.soft,
        borderColor: colour.solid,
        borderStyle: "dotted",
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
        <div class="mx-auto flex w-full max-w-[880px] flex-col gap-6">
            <section
                v-for="page in props.slices"
                :id="`page-${page.start}`"
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
                    <template
                        v-for="(part, index) in segmentsOf(page)"
                        :key="index"
                    >
                        <span v-if="part.kind === 'text'">{{ part.text }}</span>

                        <button
                            v-else
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
                            @contextmenu.prevent="openMenu($event, part.detection)"
                        >{{ detectionText(part.detection, part.text) }}</button>
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

    <!-- One menu for the whole document, placed where the reader clicked. -->
    <UDropdownMenu
        v-model:open="menuOpen"
        :items="menuTarget ? menuItems(menuTarget) : []"
    >
        <div
            class="fixed size-px"
            :style="{ left: `${menuAt.x}px`, top: `${menuAt.y}px` }"
        />
    </UDropdownMenu>
</template>
