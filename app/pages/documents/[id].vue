<script lang="ts" setup>
import type {
    DocumentView,
    ReviewTool,
} from "~/composables/useDocumentReview";
import { usePdfExport } from "~/composables/usePdfExport";

const { t } = useI18n();
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
    removeDetection,
} = useDocumentReview(documentId);

// A marked PDF has no text to review here: it is refined in an editor such as
// Kofax. Reached by its address, it goes back to the list, where it is
// downloaded.
const localePath = useLocalePath();
watch(
    () => storedDocument.value?.markedPdf,
    (markedPdf) => {
        if (markedPdf) {
            void navigateTo(localePath("/documents"), { replace: true });
        }
    },
    { immediate: true }
);

/** Whether the document is a PDF whose marks are reviewed over the original. */
const isPdfReview = computed(
    () =>
        storedDocument.value?.pdfReview === true ||
        // A document still in the superseded mode reads as the review it
        // would be today, if its marks ever came back as annotations.
        (storedDocument.value?.markedPdf === true &&
            storedDocument.value?.markedFile === undefined &&
            storedDocument.value?.detectionCount > 0)
);

const { slices, hasPages, pageOf, detectionCounts } = useDocumentPages(
    () => storedDocument.value?.text ?? "",
    () => storedDocument.value?.pageOffsets ?? [],
    detections
);

const view = ref<DocumentView>("editor");
const blackout = ref(false);
const tool = ref<ReviewTool>("select");
const markerLabel = ref("");
/** Whether the page rail is folded down to its strip. */
const pagesCollapsed = ref(false);

/** The document is out at the API, so its detections are about to be replaced. */
const isBusy = computed(
    () =>
        storedDocument.value?.status === "staged" ||
        storedDocument.value?.status === "converting" ||
        storedDocument.value?.status === "redacting"
);

const { exportAs } = useReviewExport(
    slices,
    replacements,
    blackout,
    () => storedDocument.value?.name ?? "document"
);

/** Writes the review's answer onto the PDF, as an annotated PDF to download. */
const { exportAsPdf, isExportingPdf } = usePdfExport(
    documentId,
    replacements,
    blackout
);

const sidebar = useTemplateRef<{ reveal: (id: string) => void }>("sidebar");

const { selectedId, activePage, goToPage, selectDetection } =
    useReviewNavigation(
        detections,
        () => storedDocument.value?.pageOffsets ?? [],
        pageOf
    );

const wizardOpen = ref(false);

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

/**
 * A click on a mark in the document rings its row and brings it into view:
 * the reader works from the page, the list follows.
 */
function selectFromDocument(id: string | undefined): void {
    void selectDetection(id);
    if (id) {
        sidebar.value?.reveal(id);
    }
}
</script>

<template>
    <div v-if="storedDocument" class="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
        <!-- A PDF whose marks are reviewed over the original: one view of the
             file with the marks on it, no text to show or preview. -->
        <ReviewPdfHeader
            v-if="isPdfReview"
            :name="storedDocument.name"
            :labels="availableLabels"
            :counts="counts"
            :busy="isBusy || isExportingPdf"
            @export-pdf="exportAsPdf(detections)"
        />

        <ReviewHeader
            v-else
            v-model:view="view"
            v-model:blackout="blackout"
            v-model:tool="tool"
            v-model:marker-label="markerLabel"
            :labels="availableLabels"
            :name="storedDocument.name"
            :counts="counts"
            @open-wizard="wizardOpen = true"
            @export="exportAs"
        />

        <div
            class="grid min-h-0 flex-1 gap-4"
            :class="isPdfReview
                ? 'lg:grid-cols-[minmax(0,1fr)_var(--width-detections)]'
                : hasPages
                    ? (pagesCollapsed
                        ? 'lg:grid-cols-[var(--width-page-rail-collapsed)_minmax(0,1fr)_var(--width-detections)] lg:gap-2'
                        : 'lg:grid-cols-[var(--width-page-rail)_minmax(0,1fr)_var(--width-detections)]')
                    : 'lg:grid-cols-[minmax(0,1fr)_var(--width-detections)]'"
        >
            <ReviewPageList
                v-if="hasPages && !isPdfReview"
                class="hidden lg:flex"
                v-model:collapsed="pagesCollapsed"
                :counts="detectionCounts"
                :active-page="activePage"
                @select="goToPage"
            />

            <ReviewPdfDocumentView
                v-if="isPdfReview"
                :document="storedDocument"
                :detections="detections"
                :selected-id="selectedId"
                :labels="availableLabels"
                @select="selectFromDocument($event)"
                @set-state="setState"
                @set-all-occurrences="setAllOccurrences"
                @relabel="relabel"
                @remove-detection="removeDetection"
            />

            <ReviewDocumentText
                v-else
                :slices="slices"
                :view="view"
                :blackout="blackout"
                :replacements="replacements"
                :selected-id="selectedId"
                :labels="availableLabels"
                :tool="tool"
                :marker-label="markerLabel"
                @visible-page="activePage = $event"
                @select="selectFromDocument($event)"
                @set-state="setState"
                @set-all-occurrences="setAllOccurrences"
                @relabel="relabel"
                @remove-detection="removeDetection"
                @annotate="annotate"
            />

            <ReviewDetectionSidebar
                ref="sidebar"
                :threshold="threshold"
                :threshold-floor="thresholdFloor"
                :document-id="documentId"
                :group-id="storedDocument.entityGroupId"
                :busy="isBusy"
                :groups="groups"
                :counts="counts"
                :selected-id="selectedId"
                :occurrences-of="occurrenceCount"
                :readonly="!isPdfReview && view !== 'editor'"
                :allow-recompute="!isPdfReview"
                @update:threshold="setThreshold"
                @select="selectDetection($event, true)"
                @set-state="setState"
                @set-group-state="setGroupState"
                @set-all-occurrences="setAllOccurrences"
                @set-all-states="setAllStates"
            />
        </div>

        <ReviewWizard
            v-if="!isPdfReview"
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
