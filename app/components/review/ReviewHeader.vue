<script lang="ts" setup>
import type {
    DocumentView,
    ReviewTool,
} from "~/composables/useDocumentReview";

const props = defineProps<{
    name: string;
    counts: { total: number; redacted: number; unredacted: number };
    /** Entity types this document was detected with. */
    labels: string[];
}>();
const emit = defineEmits<{
    openWizard: [];
    export: [format: "markdown" | "text" | "docx" | "clipboard"];
}>();

const view = defineModel<DocumentView>("view", { default: "editor" });
/** Preview only: write redactions as black bars instead of placeholders. */
const blackout = defineModel<boolean>("blackout", { default: false });
/** The tool in the reader's hand, and the type a mark is filed under. */
const tool = defineModel<ReviewTool>("tool", { default: "select" });
const markerLabel = defineModel<string>("markerLabel", { default: "" });

const { t } = useI18n();
const localePath = useLocalePath();
const { canUndo, canRedo, undo, redo } = useCommandHistory();

const isEditing = computed(() => view.value === "editor");

const viewItems = computed(() =>
    (["editor", "preview"] as const).map((value) => ({
        label: t(`review.view.${value}`),
        value,
        icon: value === "editor" ? "i-lucide-pen-line" : "i-lucide-eye"
    }))
);
</script>

<template>
    <!-- Three tracks rather than one row: the outer two take whatever the
         controls need and the tabs sit in the middle, where they stay put as
         the controls beside them come and go.

         The middle of this toolbar is not the middle of the window: the
         workspace nav takes a column to the left of it. The tabs are pulled
         back by half that column so they line up with the centre of the
         footer, and the title gives up the same half so the two never meet. -->
    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div
            class="flex min-w-0 items-center gap-2 lg:pe-[calc(var(--width-workspace-nav)/2)]"
        >
            <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-arrow-left"
                :to="localePath('/documents')"
                :aria-label="t('review.back')"
            />

            <div class="min-w-0">
                <h1 class="truncate text-title font-semibold text-highlighted">
                    {{ props.name }}
                </h1>
                <p class="text-xs text-muted">
                    {{ t("review.found", { count: props.counts.total }) }}
                    · {{ t("review.redactedCount", { count: props.counts.redacted }) }}
                </p>
            </div>
        </div>

        <div class="flex items-center lg:translate-x-[calc(var(--width-workspace-nav)/-2)]">
            <UTabs
                v-model="view"
                :items="viewItems"
                :content="false"
            />
        </div>

        <div class="flex items-center justify-end gap-2">
            <!-- How a redaction is written is a property of the result, not a
                 view of its own: the document underneath is the same either
                 way. It sits with the tools rather than with the tabs, which
                 leaves the tabs alone in the middle. -->
            <ReviewRedactionStyle
                v-if="!isEditing"
                v-model="blackout"
                class="whitespace-nowrap"
            />

            <!-- Editing is the only place decisions are made, so the tools that
                 make them are only there. -->
            <template v-if="isEditing">
                <UndoRedoButtons
                    :can-undo="canUndo"
                    :can-redo="canRedo"
                    @undo="undo"
                    @redo="redo"
                />

                <ReviewMarkerControls
                    v-model:tool="tool"
                    v-model:marker-label="markerLabel"
                    :labels="props.labels"
                />

                <UButton
                    icon="i-lucide-wand-sparkles"
                    variant="soft"
                    :disabled="props.counts.total === 0"
                    :title="t('review.wizard.open')"
                    :aria-label="t('review.wizard.open')"
                    @click="emit('openWizard')"
                />
            </template>

            <ReviewExportMenu
                v-model:blackout="blackout"
                @export="emit('export', $event)"
            />
        </div>
    </div>
</template>
