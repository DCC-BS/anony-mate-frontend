<script lang="ts" setup>
/**
 * The review of a PDF whose marks are decided here: one export, the
 * annotated PDF; no editor or preview tabs, because the file is the only
 * view there is.
 */
const props = defineProps<{
    name: string;
    /** Entity types this document was detected with. */
    labels: string[];
    counts: { total: number; redacted: number; unredacted: number };
    /** While the document is out at the API or the annotated PDF is writing. */
    busy?: boolean;
}>();
const emit = defineEmits<{ exportPdf: [] }>();

const blackout = defineModel<boolean>("blackout", { default: false });

const { t } = useI18n();
const localePath = useLocalePath();
const { canUndo, canRedo, undo, redo } = useCommandHistory();
const isExporting = computed(() => props.busy ?? false);
</script>

<template>
    <!-- As ReviewHeader: three tracks, controls in the outer two. -->
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
            <UndoRedoButtons
                :can-undo="canUndo"
                :can-redo="canRedo"
                @undo="undo"
                @redo="redo"
            />
        </div>

        <div class="flex items-center justify-end gap-2">
            <ReviewRedactionStyle v-model="blackout" class="whitespace-nowrap" />

            <UButton
                icon="i-lucide-download"
                :loading="isExporting"
                :disabled="props.counts.redacted === 0"
                @click="emit('exportPdf')"
            >
                {{ t("export.annotatedPdf") }}
            </UButton>
        </div>
    </div>
</template>