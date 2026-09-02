<script lang="ts" setup>
import type { DocumentView } from "~/composables/useDocumentReview";

const props = defineProps<{
    name: string;
    total: number;
    openCount: number;
    /** Entity types this document was detected with. */
    labels: string[];
}>();
const emit = defineEmits<{
    openWizard: [];
    export: [format: "markdown" | "text" | "docx" | "clipboard"];
}>();

const view = defineModel<DocumentView>("view", { default: "original" });
/** Marking mode: selected words become a detection of the chosen type. */
const marker = defineModel<boolean>("marker", { default: false });
const markerLabel = defineModel<string>("markerLabel", { default: "" });

const { t } = useI18n();
const localePath = useLocalePath();
const { canUndo, canRedo, undo, redo } = useCommandHistory();

const viewItems = computed(() =>
    (["original", "anonymised", "blacked"] as const).map((value) => ({
        label: t(`review.view.${value}`),
        value
    }))
);
</script>

<template>
    <div class="flex flex-wrap items-center gap-2">
        <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-arrow-left"
            :to="localePath('/documents')"
            :aria-label="t('review.back')"
        />

        <div class="min-w-0 flex-1">
            <h1 class="truncate text-title font-semibold text-highlighted">
                {{ props.name }}
            </h1>
            <p class="text-xs text-muted">
                {{ t("review.found", { count: props.total }) }}
                · {{ t("review.openCount", { count: props.openCount }) }}
            </p>
        </div>

        <UndoRedoButtons
            :can-undo="canUndo"
            :can-redo="canRedo"
            @undo="undo"
            @redo="redo"
        />

        <!-- Marking is only meaningful on the reviewable rendering, where the
             original words are still on screen. -->
        <ReviewMarkerControls
            v-if="view === 'original'"
            v-model:marker="marker"
            v-model:marker-label="markerLabel"
            :labels="props.labels"
        />

        <UTabs
            v-model="view"
            :items="viewItems"
            :content="false"
        />

        <UButton
            icon="i-lucide-wand-sparkles"
            variant="soft"
            :disabled="props.openCount === 0"
            @click="emit('openWizard')"
        >
            {{ t("review.wizard.open", { count: props.openCount }) }}
        </UButton>

        <ReviewExportMenu :open-count="props.openCount" @export="emit('export', $event)" />
    </div>
</template>
