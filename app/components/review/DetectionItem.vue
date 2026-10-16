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
    /** A hand-drawn mark's guessed content, corrected by the reader. */
    rename: [id: string, text: string];
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

// Only a hand-drawn mark's content is the reader's own: the guess can be
// wrong, so the row lets it be corrected. A found mark's text is what the
// layout read and stays as it is.
const editable = computed(() => props.detection.manual && !props.readonly);

const editing = ref(false);
const draft = ref("");
const input = useTemplateRef<{ inputRef?: HTMLInputElement }>("input");

function startEditing(): void {
    draft.value = props.detection.text;
    editing.value = true;
    nextTick(() => input.value?.inputRef?.select());
}

function commit(): void {
    if (!editing.value) {
        return;
    }
    editing.value = false;
    if (draft.value !== props.detection.text) {
        emit("rename", props.detection.id, draft.value);
    }
}
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
        <!-- The text button and the actions stay direct children of the row:
             the reviews' helpers walk from one to the others. -->
        <UInput
            v-if="editing"
            ref="input"
            v-model="draft"
            size="sm"
            icon="i-lucide-pen-line"
            :placeholder="t('review.renameDetection')"
            :aria-label="t('review.renameDetection')"
            class="min-w-0 flex-1"
            @keydown.esc="editing = false"
            @blur="commit"
            @keydown.enter="commit"
        />
        <button
            v-else
            type="button"
            class="min-w-0 flex-1 text-left"
            @click="emit('select', props.detection.id)"
        >
            <div class="flex items-center gap-1 truncate font-mono text-xs">
                <span class="min-w-0 flex-1 truncate">
                    {{ props.detection.text || t("review.contentMissing") }}
                </span>
                <UIcon
                    v-if="editable"
                    name="i-lucide-pencil-line"
                    class="size-3.5 shrink-0 text-muted"
                />
            </div>
            <div class="flex items-center gap-2 text-xs text-muted">
                <span class="tabular-nums">{{ confidencePercent }}%</span>
                <span>·</span>
                <span>{{ t(`review.state.${props.detection.state}`) }}</span>
            </div>
        </button>

        <template v-if="!props.readonly">
            <UButton
                v-if="editable && !editing"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-pencil-line"
                :aria-label="t('review.renameDetection')"
                :title="t('review.renameDetection')"
                @click.stop="startEditing"
            />

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
