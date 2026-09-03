<script lang="ts" setup>
import type { DetectionGroup } from "~/composables/useDetectionGroups";
import type { DetectionState } from "~/types/storedDocument";

const props = defineProps<{
    groups: DetectionGroup[];
    counts: { total: number; redacted: number; unredacted: number };
    selectedId?: string;
    occurrencesOf: (text: string) => number;
    /** The preview only reads the document; deciding happens in the editor. */
    readonly?: boolean;
    /** Confidence the document was detected with; the slider starts there. */
    thresholdFloor?: number;
    documentId: string;
    /** Detection group the document was detected with, if it records one. */
    groupId?: string;
    /** True while the document is queued or being detected again. */
    busy?: boolean;
}>();
const emit = defineEmits<{
    /** The detection now under the ring, or nothing once it is let go. */
    select: [id: string | undefined];
    setState: [id: string, state: DetectionState];
    setGroupState: [label: string, state: DetectionState];
    setAllOccurrences: [text: string, state: DetectionState];
    setAllStates: [state: DetectionState];
}>();

/** Confidence a detection needs to stay in the review. */
const threshold = defineModel<number>("threshold", {
    default: DETECTION_THRESHOLD
});

const { t } = useI18n();

const { query, rows, estimateRow, toggleGroup } = useDetectionRows(
    () => props.groups,
    () => !props.readonly
);
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-3">
        <ReviewDetectionToolbar
            v-model:threshold="threshold"
            :total="props.counts.total"
            :document-id="props.documentId"
            :group-id="props.groupId"
            :busy="props.busy"
            :threshold-floor="props.thresholdFloor"
        />

        <ReviewDetectionStats :counts="props.counts" />

        <div v-if="!props.readonly && props.counts.total" class="flex gap-2">
            <UButton
                size="xs"
                variant="soft"
                block
                icon="i-lucide-eye-off"
                :disabled="props.counts.unredacted === 0"
                @click="emit('setAllStates', 'redacted')"
            >
                {{ t("review.redactAll") }}
            </UButton>
            <UButton
                size="xs"
                variant="soft"
                color="neutral"
                block
                icon="i-lucide-eye"
                :disabled="props.counts.redacted === 0"
                @click="emit('setAllStates', 'unredacted')"
            >
                {{ t("review.unredactAll") }}
            </UButton>
        </div>

        <UInput
            v-model="query"
            icon="i-lucide-search"
            size="sm"
            :placeholder="t('review.searchPlaceholder')"
        />

        <UScrollArea
            :items="rows"
            :virtualize="{ estimateSize: estimateRow, overscan: 12 }"
            class="min-h-0 flex-1 rounded-md border border-accented"
        >
            <template #default="{ item }">
                <ReviewDetectionGroup
                    v-if="item.kind === 'group'"
                    :label="item.label"
                    :count="item.count"
                    :unredacted-count="item.unredactedCount"
                    :expanded="item.expanded"
                    :readonly="props.readonly"
                    @toggle="toggleGroup"
                    @set-group-state="(label, state) => emit('setGroupState', label, state)"
                />

                <div v-else class="px-2 py-1">
                    <ReviewDetectionItem
                        :detection="item.detection"
                        :selected="item.detection.id === props.selectedId"
                        :occurrences="props.occurrencesOf(item.detection.text)"
                        :readonly="props.readonly"
                        @select="emit('select', $event === props.selectedId ? undefined : $event)"
                        @set-state="(id, state) => emit('setState', id, state)"
                        @set-all-occurrences="(text, state) => emit('setAllOccurrences', text, state)"
                    />
                </div>
            </template>
        </UScrollArea>
    </div>
</template>
