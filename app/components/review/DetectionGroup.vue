<script lang="ts" setup>
import type { StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    label: string;
    items: StoredDetection[];
    openCount: number;
    selectedId?: string;
    occurrencesOf: (text: string) => number;
}>();
const emit = defineEmits<{
    select: [id: string];
    decide: [id: string, state: StoredDetection["state"]];
    decideGroup: [label: string, state: StoredDetection["state"]];
    decideAll: [text: string, state: StoredDetection["state"]];
}>();

const { t } = useI18n();

const { getEntityColor } = useEntityColor();
</script>

<template>
    <UCollapsible class="border-b border-(--ui-border) last:border-0">
        <template #default>
            <button
                type="button"
                class="flex w-full items-center gap-2 p-2 text-sm hover:bg-(--ui-bg-muted)"
            >
                <span class="size-2 rounded-full" :style="{ background: getEntityColor(props.label).solid }" />
                <span class="flex-1 text-left">{{ props.label }}</span>
                <UBadge v-if="props.openCount" size="sm" color="warning" variant="subtle">
                    {{ t("review.openCount", { count: props.openCount }) }}
                </UBadge>
                <span class="tabular-nums text-xs text-(--ui-text-muted)">
                    {{ props.items.length }}
                </span>
            </button>
        </template>

        <template #content>
            <div class="flex flex-col gap-2 p-2">
                <div class="flex gap-2">
                    <UButton
                        size="xs"
                        variant="soft"
                        block
                        @click="emit('decideGroup', props.label, 'accepted')"
                    >
                        {{ t("review.acceptAll") }}
                    </UButton>
                    <UButton
                        size="xs"
                        variant="soft"
                        color="neutral"
                        block
                        @click="emit('decideGroup', props.label, 'rejected')"
                    >
                        {{ t("review.rejectAll") }}
                    </UButton>
                </div>

                <ReviewDetectionItem
                    v-for="item in props.items"
                    :key="item.id"
                    :detection="item"
                    :selected="item.id === props.selectedId"
                    :occurrences="props.occurrencesOf(item.text)"
                    @select="emit('select', $event)"
                    @decide="(id, state) => emit('decide', id, state)"
                    @decide-all="(text, state) => emit('decideAll', text, state)"
                />
            </div>
        </template>
    </UCollapsible>
</template>
