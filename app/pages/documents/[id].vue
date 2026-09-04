<script lang="ts" setup>
import type {
    DocumentView,
    ReviewTool,
} from "~/composables/useDocumentReview";

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
</script>

<template>
    <div v-if="storedDocument" class="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
        <ReviewHeader
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
            :class="hasPages
                ? (pagesCollapsed
                    ? 'lg:grid-cols-[var(--width-page-rail-collapsed)_minmax(0,1fr)_var(--width-detections)] lg:gap-2'
                    : 'lg:grid-cols-[var(--width-page-rail)_minmax(0,1fr)_var(--width-detections)]')
                : 'lg:grid-cols-[minmax(0,1fr)_var(--width-detections)]'"
        >
            <ReviewPageList
                v-if="hasPages"
                class="hidden lg:flex"
                v-model:collapsed="pagesCollapsed"
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
                :tool="tool"
                :marker-label="markerLabel"
                @visible-page="activePage = $event"
                @select="selectDetection($event)"
                @set-state="setState"
                @set-all-occurrences="setAllOccurrences"
                @relabel="relabel"
                @remove-detection="removeDetection"
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
