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
    openDetections,
    counts,
    groups,
    replacements,
    decide,
    decideGroup,
    decideAllOccurrences,
    decideAllOpen,
    occurrenceCount,
    relabel,
    addDetection,
} = useDocumentReview(documentId);

const { slices, hasPages, pageOf, detectionCounts } = useDocumentPages(
    () => storedDocument.value?.text ?? "",
    () => storedDocument.value?.pageOffsets ?? [],
    detections
);

const view = ref<DocumentView>("original");
const activePage = ref(1);
const markerActive = ref(false);
const markerLabel = ref("");

const { exportAsMarkdown, exportAsText, exportAsDocx, renderPage } =
    useDocumentExport();

/** The result pages of the current view; docx breaks a page between them. */
const exportPages = computed(() =>
    slices.value.map((page) =>
        renderPage(
            page,
            view.value === "blacked" ? "blacked" : "placeholder",
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

/** Selects a detection, scrolls it into view and follows it in the page rail. */
function selectDetection(id: string) {
    selectedId.value = id;
    const detection = detections.value.find((item) => item.id === id);
    if (detection) {
        activePage.value = pageOf(detection.start);
    }

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
            v-model:marker="markerActive"
            v-model:marker-label="markerLabel"
            :labels="availableLabels"
            :name="storedDocument.name"
            :total="counts.total"
            :open-count="counts.open"
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
                :replacements="replacements"
                :selected-id="selectedId"
                :labels="availableLabels"
                :marker="markerActive"
                :marker-label="markerLabel"
                @visible-page="activePage = $event"
                @select="selectDetection"
                @decide="decide"
                @decide-all="decideAllOccurrences"
                @relabel="relabel"
                @annotate="annotate"
            />

            <ReviewDetectionSidebar
                :groups="groups"
                :counts="counts"
                :selected-id="selectedId"
                :occurrences-of="occurrenceCount"
                @visible-page="activePage = $event"
                @select="selectDetection"
                @decide="decide"
                @decide-group="decideGroup"
                @decide-all="decideAllOccurrences"
                @decide-all-open="decideAllOpen"
            />
        </div>

        <ReviewWizard
            v-model:open="wizardOpen"
            :items="openDetections"
            :text="storedDocument.text"
            :available-labels="availableLabels"
            :total="counts.total"
            @decide="decide"
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
