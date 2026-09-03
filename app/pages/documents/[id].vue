<script lang="ts" setup>
import type { DocumentView } from "~/composables/useDocumentReview";

const { t } = useI18n();
const toast = useToast();
const route = useRoute();

const documentId = computed(() => String(route.params.id));

const {
    storedDocument,
    isLoading,
    detections,
    counts,
    groups,
    replacements,
    threshold,
    thresholdFloor,
    setState,
    setGroupState,
    setAllOccurrences,
    setAllStates,
    setThreshold,
    occurrenceCount,
    relabel,
    addDetection,
} = useDocumentReview(documentId);

const { slices, hasPages, pageOf, detectionCounts } = useDocumentPages(
    () => storedDocument.value?.text ?? "",
    () => storedDocument.value?.pageOffsets ?? [],
    detections
);

const view = ref<DocumentView>("editor");
const blackout = ref(false);
const activePage = ref(1);
const markerActive = ref(false);
const markerLabel = ref("");

/** The document is out at the API, so its detections are about to be replaced. */
const isBusy = computed(
    () =>
        storedDocument.value?.status === "staged" ||
        storedDocument.value?.status === "converting" ||
        storedDocument.value?.status === "redacting"
);

const { exportAsMarkdown, exportAsText, exportAsDocx, renderPage } =
    useDocumentExport();

/** The result pages of the current view; docx breaks a page between them. */
const exportPages = computed(() =>
    slices.value.map((page) =>
        renderPage(
            page,
            blackout.value ? "blacked" : "placeholder",
            replacements.value
        )
    )
);

/** Exports the current rendering in the chosen format. */
async function onExport(format: "markdown" | "text" | "docx" | "clipboard") {
    const name = storedDocument.value?.name ?? "document";
    const content = exportPages.value.join("");

    if (format === "clipboard") {
        await navigator.clipboard.writeText(content);
        toast.add({
            title: t("export.copied"),
            color: "success",
            icon: "i-lucide-check"
        });
    } else if (format === "markdown") {
        exportAsMarkdown(name, content);
    } else if (format === "text") {
        exportAsText(name, content);
    } else {
        await exportAsDocx(name, exportPages.value);
    }
}

/** Scrolls the document pane to the start of a page. */
function goToPage(page: number) {
    const offset = storedDocument.value?.pageOffsets?.[page - 1];
    if (offset === undefined) {
        return;
    }
    activePage.value = page;
    document
        .getElementById(`page-${offset}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
const wizardOpen = ref(false);
const selectedId = ref<string>();

/**
 * Selects a detection and follows it in the page rail.
 *
 * Clicking a detection in the document does not move the document: the reader
 * is already looking at it, and scrolling it to the middle of the pane pulls
 * the page out from under them. Only a click from a list, where the detection
 * is somewhere off screen, brings it into view.
 */
async function selectDetection(id: string | undefined, reveal = false) {
    selectedId.value = id;
    if (!id) {
        return;
    }

    const detection = detections.value.find((item) => item.id === id);
    if (detection) {
        activePage.value = pageOf(detection.start);
    }

    if (!reveal) {
        return;
    }

    // The preview writes its detections as markdown and renders them after the
    // view switches, so the element may not be there on the first look.
    await nextTick();
    document
        .getElementById(`detection-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

const availableLabels = computed(() =>
    Object.keys(storedDocument.value?.entityTypes ?? {})
);

// Marking needs a type to file the words under; the first is as good a default
// as any and the reader can change it in the picker.
watchEffect(() => {
    if (!markerLabel.value && availableLabels.value.length) {
        markerLabel.value = availableLabels.value[0] as string;
    }
});

/** Files the reader's selection under the type the marker is set to. */
function annotate(start: number, end: number, text: string) {
    if (!markerLabel.value) {
        return;
    }
    return addDetection(markerLabel.value, start, end, text);
}
</script>

<template>
    <div v-if="storedDocument" class="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
        <ReviewHeader
            v-model:view="view"
            v-model:blackout="blackout"
            v-model:marker="markerActive"
            v-model:marker-label="markerLabel"
            :labels="availableLabels"
            :name="storedDocument.name"
            :counts="counts"
            @open-wizard="wizardOpen = true"
            @export="onExport"
        />

        <div
            class="grid min-h-0 flex-1 gap-4"
            :class="hasPages
                ? 'lg:grid-cols-[var(--width-page-rail)_minmax(0,1fr)_var(--width-detections)]'
                : 'lg:grid-cols-[minmax(0,1fr)_var(--width-detections)]'"
        >
            <ReviewPageList
                v-if="hasPages"
                class="hidden lg:flex"
                :counts="detectionCounts"
                :active-page="activePage"
                @select="goToPage"
            />

            <ReviewDocumentText
                :slices="slices"
                :view="view"
                :blackout="blackout"
                :replacements="replacements"
                :selected-id="selectedId"
                :labels="availableLabels"
                :marker="markerActive"
                :marker-label="markerLabel"
                @visible-page="activePage = $event"
                @select="selectDetection($event)"
                @set-state="setState"
                @set-all-occurrences="setAllOccurrences"
                @relabel="relabel"
                @annotate="annotate"
            />

            <ReviewDetectionSidebar
                :threshold="threshold"
                :threshold-floor="thresholdFloor"
                :document-id="documentId"
                :group-id="storedDocument.entityGroupId"
                :busy="isBusy"
                :groups="groups"
                :counts="counts"
                :selected-id="selectedId"
                :occurrences-of="occurrenceCount"
                :readonly="view !== 'editor'"
                @update:threshold="setThreshold"
                @select="selectDetection($event, true)"
                @set-state="setState"
                @set-group-state="setGroupState"
                @set-all-occurrences="setAllOccurrences"
                @set-all-states="setAllStates"
            />
        </div>

        <ReviewWizard
            v-model:open="wizardOpen"
            :items="detections"
            :text="storedDocument.text"
            :available-labels="availableLabels"
            :total="counts.total"
            @set-state="setState"
            @relabel="relabel"
        />
    </div>

    <div v-else-if="isLoading" class="flex h-full items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-dimmed" />
    </div>

    <div v-else class="p-10 text-center text-sm text-muted">
        {{ t("review.notFound") }}
    </div>
</template>
