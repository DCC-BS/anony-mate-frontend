<script lang="ts" setup>
const props = defineProps<{
    /** How many detections the document holds at the current confidence. */
    total: number;
    documentId: string;
    /** Detection group the document was detected with, if it records one. */
    groupId?: string;
    /** True while the document is queued or being detected again. */
    busy?: boolean;
    /** Share of the scan done, while the document is being detected. */
    scanProgress?: number | null;
    /** Confidence the document was detected with; the slider starts there. */
    thresholdFloor?: number;
    /**
     * Whether the detections are re-detected: a PDF's marks are laid over the
     * original, and re-laying them needs the file read again, so the swap is
     * a text review's control.
     */
    allowRecompute?: boolean;
}>();

/** Confidence a detection needs to stay in the review. */
const threshold = defineModel<number>("threshold", {
    default: DETECTION_THRESHOLD
});

const { t } = useI18n();
</script>

<template>
    <div class="flex items-center justify-between gap-2">
        <div class="flex items-baseline gap-2">
            <h2 class="font-semibold text-highlighted">
                {{ t("review.detections") }}
            </h2>
            <span
                v-if="props.busy && props.scanProgress != null"
                class="text-xs tabular-nums text-muted"
            >
                {{ t("review.detectionsProgress", { percent: Math.round(props.scanProgress * 100) }) }}
            </span>
        </div>

        <div class="flex items-center gap-1.5">
            <!-- Re-detecting throws this whole list away and builds a new one,
                 so it sits with the list rather than with the document's own
                 tools. -->
            <RecomputeButton
                v-if="props.allowRecompute"
                size="xs"
                :document-id="props.documentId"
                :group-id="props.groupId"
                :busy="props.busy"
            />

            <UPopover>
                <UButton
                    icon="i-lucide-settings-2"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :aria-label="t('review.settings')"
                    :title="t('review.settings')"
                />

                <template #content>
                    <div class="w-64 p-3">
                        <ThresholdSlider
                            v-model="threshold"
                            :min="props.thresholdFloor"
                        />
                    </div>
                </template>
            </UPopover>
        </div>
    </div>
</template>
