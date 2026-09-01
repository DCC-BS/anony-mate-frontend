<script lang="ts" setup>
import type { StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    groups: { label: string; items: StoredDetection[]; openCount: number }[];
    counts: { total: number; open: number; accepted: number; rejected: number };
    selectedId?: string;
    occurrencesOf: (text: string) => number;
}>();
const emit = defineEmits<{
    select: [id: string];
    decide: [id: string, state: StoredDetection["state"]];
    decideGroup: [label: string, state: StoredDetection["state"]];
    decideAll: [text: string, state: StoredDetection["state"]];
    decideAllOpen: [state: StoredDetection["state"]];
}>();

const { t } = useI18n();

const query = ref("");

/** Groups the reader has opened; collapsed by default, as before. */
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
            openCount: group.openCount,
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
    return row.expanded ? ROW_HEIGHT.groupExpanded : ROW_HEIGHT.group;
}
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-3">
        <div class="flex items-baseline justify-between">
            <h2 class="font-semibold text-(--ui-text-highlighted)">
                {{ t("review.detections") }}
            </h2>
            <span class="text-xs text-(--ui-text-muted)">
                {{ t("review.found", { count: props.counts.total }) }}
            </span>
        </div>

        <ReviewDetectionStats :counts="props.counts" />

        <div v-if="props.counts.open" class="flex gap-2">
            <UButton
                size="xs"
                variant="soft"
                block
                icon="i-lucide-check-check"
                @click="emit('decideAllOpen', 'accepted')"
            >
                {{ t("review.acceptAllOpen", { count: props.counts.open }) }}
            </UButton>
            <UButton
                size="xs"
                variant="soft"
                color="neutral"
                block
                @click="emit('decideAllOpen', 'rejected')"
            >
                {{ t("review.rejectAllOpen") }}
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
                    :open-count="item.openCount"
                    :expanded="item.expanded"
                    @toggle="toggleGroup"
                    @decide-group="(label, state) => emit('decideGroup', label, state)"
                />

                <div v-else class="px-2 py-1">
                    <ReviewDetectionItem
                        :detection="item.detection"
                        :selected="item.detection.id === props.selectedId"
                        :occurrences="props.occurrencesOf(item.detection.text)"
                        @select="emit('select', $event)"
                        @decide="(id, state) => emit('decide', id, state)"
                        @decide-all="(text, state) => emit('decideAll', text, state)"
                    />
                </div>
            </template>
        </UScrollArea>
    </div>
</template>
