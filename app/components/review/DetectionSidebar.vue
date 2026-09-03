<script lang="ts" setup>
import type { DetectionState, StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    groups: {
        label: string;
        items: StoredDetection[];
        unredactedCount: number;
    }[];
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

const query = ref("");

/** Groups the reader has opened. */
const expanded = ref(new Set<string>());

function toggleGroup(label: string): void {
    const next = new Set(expanded.value);
    if (!next.delete(label)) {
        next.add(label);
    }
    expanded.value = next;
}

/** Groups filtered by the search box, empty groups dropped. */
const visibleGroups = computed(() => {
    const needle = query.value.trim().toLowerCase();
    if (!needle) {
        return props.groups;
    }

    return props.groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                item.text.toLowerCase().includes(needle)
            )
        }))
        .filter((group) => group.items.length > 0);
});

/**
 * Groups and their detections as one flat list of rows.
 *
 * A document can carry thousands of detections, and rendering them all at once
 * is what makes the sidebar crawl. Flattening lets a single virtualised scroll
 * area mount only the rows on screen, which needs one list rather than a
 * scroller per group.
 */
/**
 * Measured row heights. The virtualiser sizes the scrollbar from these until a
 * row has been rendered and measured, so an estimate that is too small makes
 * the track grow while the reader drags it and the list appears to stop short
 * of the end.
 */
const ROW_HEIGHT = { item: 58, group: 37, groupExpanded: 69 };

const rows = computed(() =>
    visibleGroups.value.flatMap((group) => {
        const header = {
            kind: "group" as const,
            id: `group:${group.label}`,
            label: group.label,
            count: group.items.length,
            unredactedCount: group.unredactedCount,
            expanded: expanded.value.has(group.label)
        };

        if (!header.expanded) {
            return [header];
        }

        return [
            header,
            ...group.items.map((detection) => ({
                kind: "item" as const,
                id: detection.id,
                detection
            }))
        ];
    })
);

function estimateRow(index: number): number {
    const row = rows.value[index];
    if (!row) {
        return ROW_HEIGHT.item;
    }
    if (row.kind === "item") {
        return ROW_HEIGHT.item;
    }
    // The bulk actions the header opens onto are not there to measure while
    // the preview has them hidden.
    return row.expanded && !props.readonly
        ? ROW_HEIGHT.groupExpanded
        : ROW_HEIGHT.group;
}
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold text-(--ui-text-highlighted)">
                {{ t("review.detections") }}
            </h2>

            <div class="flex items-center gap-1.5">
                <span class="text-xs text-(--ui-text-muted)">
                    {{ t("review.found", { count: props.counts.total }) }}
                </span>

                <!-- Re-detecting throws this whole list away and builds a new
                     one, so it sits with the list rather than with the
                     document's own tools. -->
                <RecomputeButton
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
                        @select="emit(
                            'select',
                            $event === props.selectedId ? undefined : $event
                        )"
                        @set-state="(id, state) => emit('setState', id, state)"
                        @set-all-occurrences="(text, state) => emit('setAllOccurrences', text, state)"
                    />
                </div>
            </template>
        </UScrollArea>
    </div>
</template>
