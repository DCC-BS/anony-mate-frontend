<script lang="ts" setup>
import type { DetectionState } from "~/types/storedDocument";

const props = defineProps<{
    label: string;
    /** Detections in this group. */
    count: number;
    /** How many of them the reader has taken the redaction off. */
    unredactedCount: number;
    expanded: boolean;
    /** The preview only reads the document; deciding happens in the editor. */
    readonly?: boolean;
}>();
const emit = defineEmits<{
    toggle: [label: string];
    setGroupState: [label: string, state: DetectionState];
}>();

const { t } = useI18n();

const { getEntityColor } = useEntityColor();
const { entityName } = useEntityName();
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
            <span class="flex-1 text-left">{{ entityName(props.label) }}</span>
            <!-- Redacted is the resting state of every group, so saying so on
                 each one says nothing. What is worth a badge is the exception:
                 words this group is letting through. -->
            <UBadge
                v-if="props.unredactedCount"
                size="sm"
                color="neutral"
                variant="subtle"
            >
                {{ t("review.unredactedCount", { count: props.unredactedCount }) }}
            </UBadge>
            <span class="tabular-nums text-xs text-(--ui-text-muted)">
                {{ props.count }}
            </span>
        </button>

        <div v-if="props.expanded && !props.readonly" class="flex gap-2 px-2 pb-2">
            <UButton
                size="xs"
                variant="soft"
                block
                icon="i-lucide-eye-off"
                @click="emit('setGroupState', props.label, 'redacted')"
            >
                {{ t("review.redactAll") }}
            </UButton>
            <UButton
                size="xs"
                variant="soft"
                color="neutral"
                block
                icon="i-lucide-eye"
                @click="emit('setGroupState', props.label, 'unredacted')"
            >
                {{ t("review.unredactAll") }}
            </UButton>
        </div>
    </div>
</template>
