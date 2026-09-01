<script lang="ts" setup>
const props = defineProps<{
    label: string;
    /** Detections in this group. */
    count: number;
    openCount: number;
    expanded: boolean;
}>();
const emit = defineEmits<{
    toggle: [label: string];
    decideGroup: [label: string, state: "accepted" | "rejected"];
}>();

const { t } = useI18n();

const { getEntityColor } = useEntityColor();
</script>

<template>
    <div class="border-b border-(--ui-border)">
        <button
            type="button"
            class="flex w-full items-center gap-2 p-2 text-sm hover:bg-(--ui-bg-muted)"
            :aria-expanded="props.expanded"
            @click="emit('toggle', props.label)"
        >
            <UIcon
                :name="props.expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-4 text-(--ui-text-muted)"
            />
            <span class="size-2 rounded-full" :style="{ background: getEntityColor(props.label).solid }" />
            <span class="flex-1 text-left">{{ props.label }}</span>
            <UBadge v-if="props.openCount" size="sm" color="warning" variant="subtle">
                {{ t("review.openCount", { count: props.openCount }) }}
            </UBadge>
            <span class="tabular-nums text-xs text-(--ui-text-muted)">
                {{ props.count }}
            </span>
        </button>

        <div v-if="props.expanded" class="flex gap-2 px-2 pb-2">
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
    </div>
</template>
