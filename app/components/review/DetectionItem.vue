<script lang="ts" setup>
import type { StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    detection: StoredDetection;
    selected?: boolean;
    /** How many detections share this text; > 1 offers the apply-to-all action. */
    occurrences?: number;
}>();
const emit = defineEmits<{
    select: [id: string];
    decide: [id: string, state: StoredDetection["state"]];
    decideAll: [text: string, state: StoredDetection["state"]];
}>();

const { t } = useI18n();

const confidencePercent = computed(() =>
    Math.round(props.detection.confidence * 100)
);

const hasOccurrences = computed(() => (props.occurrences ?? 0) > 1);
const isDecided = computed(() => props.detection.state !== "open");
</script>

<template>
    <div
        :class="[
            'flex items-center gap-2 rounded-(--ui-radius) border p-2 text-sm',
            props.selected ? 'border-primary' : 'border-accented',
            isDecided && 'opacity-55'
        ]"
    >
        <button
            type="button"
            class="min-w-0 flex-1 text-left"
            @click="emit('select', props.detection.id)"
        >
            <div class="truncate font-mono text-xs">{{ props.detection.text }}</div>
            <div class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
                <span class="tabular-nums">{{ confidencePercent }}%</span>
                <span>·</span>
                <span>{{ t(`review.state.${props.detection.state}`) }}</span>
            </div>
        </button>

        <UButton
            v-if="hasOccurrences"
            size="xs"
            variant="ghost"
            color="success"
            icon="i-lucide-check-check"
            :title="t('review.acceptAllOccurrences', { count: props.occurrences })"
            @click.stop="emit('decideAll', props.detection.text, 'accepted')"
        />

        <UButton
            size="xs"
            variant="ghost"
            color="success"
            icon="i-lucide-check"
            :aria-label="t('review.accept')"
            @click.stop="emit('decide', props.detection.id, 'accepted')"
        />
        <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            :aria-label="t('review.reject')"
            @click.stop="emit('decide', props.detection.id, 'rejected')"
        />
    </div>
</template>
