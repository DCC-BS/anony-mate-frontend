<script lang="ts" setup>
import type { DetectionState, StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    detection: StoredDetection;
    selected?: boolean;
    /** How many detections share this text; > 1 offers the apply-to-all action. */
    occurrences?: number;
    /** The preview only reads the document; deciding happens in the editor. */
    readonly?: boolean;
}>();
const emit = defineEmits<{
    select: [id: string];
    setState: [id: string, state: DetectionState];
    setAllOccurrences: [text: string, state: DetectionState];
}>();

const { t } = useI18n();

const confidencePercent = computed(() =>
    Math.round(props.detection.confidence * 100)
);

const hasOccurrences = computed(() => (props.occurrences ?? 0) > 1);
const isRedacted = computed(() => props.detection.state === "redacted");

/** The state this row's toggle moves the detection to. */
const nextState = computed<DetectionState>(() =>
    isRedacted.value ? "unredacted" : "redacted"
);
</script>

<template>
    <div
        :class="[
            'flex items-center gap-2 rounded-(--ui-radius) border p-2 text-sm',
            props.selected ? 'border-primary' : 'border-accented',
            // An un-redacted detection is one the reader has settled, so it
            // recedes — but it stays here, and stays one click from redacted.
            !isRedacted && 'opacity-55'
        ]"
    >
        <button
            type="button"
            class="min-w-0 flex-1 text-left"
            @click="emit('select', props.detection.id)"
        >
            <div class="truncate font-mono text-xs">{{ props.detection.text }}</div>
            <div class="flex items-center gap-2 text-xs text-muted">
                <span class="tabular-nums">{{ confidencePercent }}%</span>
                <span>·</span>
                <span>{{ t(`review.state.${props.detection.state}`) }}</span>
            </div>
        </button>

        <template v-if="!props.readonly">
            <UButton
                v-if="hasOccurrences"
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="isRedacted ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                :title="isRedacted
                    ? t('review.unredactAllOccurrences', { count: props.occurrences })
                    : t('review.redactAllOccurrences', { count: props.occurrences })"
                @click.stop="emit('setAllOccurrences', props.detection.text, nextState)"
            >
                {{ props.occurrences }}
            </UButton>

            <UButton
                size="xs"
                :variant="isRedacted ? 'ghost' : 'soft'"
                :color="isRedacted ? 'neutral' : 'primary'"
                :icon="isRedacted ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                :aria-label="isRedacted ? t('review.unredact') : t('review.redact')"
                :title="isRedacted ? t('review.unredact') : t('review.redact')"
                @click.stop="emit('setState', props.detection.id, nextState)"
            />
        </template>
    </div>
</template>
