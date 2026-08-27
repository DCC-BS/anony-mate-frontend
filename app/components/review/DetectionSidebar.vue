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

        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border border-accented">
            <ReviewDetectionGroup
                v-for="group in visibleGroups"
                :key="group.label"
                v-bind="group"
                :selected-id="props.selectedId"
                :occurrences-of="props.occurrencesOf"
                @select="emit('select', $event)"
                @decide="(id, state) => emit('decide', id, state)"
                @decide-group="(label, state) => emit('decideGroup', label, state)"
                @decide-all="(text, state) => emit('decideAll', text, state)"
            />
        </div>
    </div>
</template>
