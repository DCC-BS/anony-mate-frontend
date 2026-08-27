<script lang="ts" setup>
import type { StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    open: boolean;
    items: StoredDetection[];
    text: string;
    availableLabels: string[];
    total: number;
}>();
const emit = defineEmits<{
    "update:open": [value: boolean];
    decide: [id: string, state: StoredDetection["state"]];
    relabel: [id: string, label: string];
}>();

const { t } = useI18n();
const { getEntityColor } = useEntityColor();

/** Detections put off with "later", so the wizard does not offer them again. */
const skipped = ref<string[]>([]);

const queue = computed(() =>
    props.items.filter((item) => !skipped.value.includes(item.id))
);
const current = computed(() => queue.value[0]);

const progressPercent = computed(() =>
    props.total === 0
        ? 100
        : Math.round(((props.total - queue.value.length) / props.total) * 100)
);

/** A short window of text around the detection, for context. */
const context = computed(() => {
    if (!current.value) {
        return { before: "", match: "", after: "" };
    }
    return {
        before: props.text.slice(Math.max(0, current.value.start - 120), current.value.start),
        match: props.text.slice(current.value.start, current.value.end),
        after: props.text.slice(current.value.end, current.value.end + 120)
    };
});

function decide(state: StoredDetection["state"]) {
    if (current.value) {
        emit("decide", current.value.id, state);
    }
}

function skip() {
    if (current.value) {
        skipped.value = [...skipped.value, current.value.id];
    }
}

/** Moves the detection to the next entity type in the list. */
function cycleLabel() {
    if (!current.value || props.availableLabels.length === 0) {
        return;
    }
    const index = props.availableLabels.indexOf(current.value.label);
    const next = props.availableLabels[(index + 1) % props.availableLabels.length];
    if (next) {
        emit("relabel", current.value.id, next);
    }
}

defineShortcuts({
    enter: () => props.open && decide("accepted"),
    backspace: () => props.open && decide("rejected"),
    arrowright: () => props.open && skip()
});
</script>

<template>
    <UModal
        :open="props.open"
        :title="t('review.wizard.title')"
        :description="t('review.wizard.progress', {
            done: props.total - queue.length,
            total: props.total
        })"
        @update:open="emit('update:open', $event)"
    >
        <template #body>
            <div v-if="current" class="flex flex-col gap-4">
                <UProgress :model-value="progressPercent" size="sm" />

                <div class="flex items-center gap-2 text-sm">
                    <span
                        class="size-2 rounded-full"
                        :style="{ background: getEntityColor(current.label).solid }"
                    />
                    <span class="font-medium">{{ current.label }}</span>
                    <span class="text-(--ui-text-muted)">
                        {{ Math.round(current.confidence * 100) }}%
                    </span>
                    <UButton
                        class="ms-auto"
                        size="xs"
                        variant="soft"
                        color="neutral"
                        @click="cycleLabel"
                    >
                        {{ t("review.wizard.changeCategory") }}
                    </UButton>
                </div>

                <p class="rounded-(--ui-radius) border border-(--ui-border) p-3 text-sm leading-relaxed">
                    <span class="text-(--ui-text-muted)">…{{ context.before }}</span>
                    <span
                        class="rounded border px-0.5"
                        :style="{
                            background: getEntityColor(current.label).soft,
                            borderColor: getEntityColor(current.label).solid
                        }"
                    >
                        {{ context.match }}
                    </span>
                    <span class="text-(--ui-text-muted)">{{ context.after }}…</span>
                </p>

                <p class="text-xs text-(--ui-text-muted)">{{ t("review.wizard.hint") }}</p>
            </div>

            <div v-else class="flex flex-col items-center gap-3 py-8 text-center">
                <UIcon name="i-lucide-check-circle" class="size-8 text-(--ui-success)" />
                <p class="text-sm">{{ t("review.wizard.done") }}</p>
            </div>
        </template>

        <template #footer>
            <div v-if="current" class="flex w-full gap-2">
                <UButton variant="soft" color="neutral" @click="decide('rejected')">
                    {{ t("review.reject") }} ⌫
                </UButton>
                <UButton variant="ghost" color="neutral" @click="skip">
                    {{ t("review.wizard.later") }} →
                </UButton>
                <UButton class="ms-auto" color="primary" @click="decide('accepted')">
                    {{ t("review.accept") }} ⏎
                </UButton>
            </div>

            <UButton v-else block @click="emit('update:open', false)">
                {{ t("review.wizard.close") }}
            </UButton>
        </template>
    </UModal>
</template>
