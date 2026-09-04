<script lang="ts" setup>
import type { DetectionState, StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    open: boolean;
    items: StoredDetection[];
    text: string;
    availableLabels: string[];
    total: number;
}>();
const emit = defineEmits<{
    "update:open": [value: boolean];
    setState: [id: string, state: DetectionState];
    relabel: [id: string, label: string];
}>();

const { t } = useI18n();
const { getEntityColor } = useEntityColor();
const { entityName } = useEntityName();

/** Detections put off with "later", so the wizard does not offer them again. */
const skipped = ref<string[]>([]);

/**
 * What is left to look at.
 *
 * Everything starts redacted, so the wizard walks the redactions rather than a
 * queue of undecided findings: each step asks whether this one has to be taken
 * out, and un-redacting it is what settles it.
 */
const queue = computed(() =>
    props.items.filter(
        (item) =>
            item.state === "redacted" && !skipped.value.includes(item.id)
    )
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

function setState(state: DetectionState) {
    if (current.value) {
        emit("setState", current.value.id, state);
    }
}

function skip() {
    if (current.value) {
        skipped.value = [...skipped.value, current.value.id];
    }
}

const labelItems = computed(() =>
    props.availableLabels.map((label) => ({
        label: entityName(label),
        value: label
    }))
);

/** Files the detection under another entity type. */
function chooseLabel(label: string) {
    if (current.value && label !== current.value.label) {
        emit("relabel", current.value.id, label);
    }
}

defineShortcuts({
    enter: () => props.open && skip(),
    backspace: () => props.open && setState("unredacted"),
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
                    <span class="text-muted">
                        {{ Math.round(current.confidence * 100) }}%
                    </span>

                    <!-- The type is the control, not a caption: a document can
                         carry dozens, so it is picked by name rather than by
                         stepping through them one at a time. -->
                    <USelectMenu
                        class="ms-auto w-52"
                        size="sm"
                        :model-value="current.label"
                        :items="labelItems"
                        value-key="value"
                        :search-input="{ placeholder: t('review.marker.search') }"
                        @update:model-value="chooseLabel"
                    >
                        <template #leading>
                            <EntityDot :label="current.label" />
                        </template>

                        <template #item-leading="{ item }">
                            <EntityDot :label="item.value" />
                        </template>
                    </USelectMenu>
                </div>

                <p class="rounded-(--ui-radius) border border-default p-3 text-sm leading-relaxed">
                    <span class="text-muted">…{{ context.before }}</span>
                    <span
                        class="rounded border px-0.5"
                        :style="{
                            background: getEntityColor(current.label).soft,
                            borderColor: getEntityColor(current.label).solid
                        }"
                    >
                        {{ context.match }}
                    </span>
                    <span class="text-muted">{{ context.after }}…</span>
                </p>

                <p class="text-xs text-muted">{{ t("review.wizard.hint") }}</p>
            </div>

            <div v-else class="flex flex-col items-center gap-3 py-8 text-center">
                <UIcon name="i-lucide-check-circle" class="size-8 text-success" />
                <p class="text-sm">{{ t("review.wizard.done") }}</p>
            </div>
        </template>

        <template #footer>
            <!-- Keeping the redaction is the safe move and the one the reader
                 makes most, so it is the primary button and the one Enter
                 presses. -->
            <div v-if="current" class="flex w-full gap-2">
                <UButton
                    variant="soft"
                    color="neutral"
                    icon="i-lucide-eye"
                    @click="setState('unredacted')"
                >
                    {{ t("review.unredact") }} ⌫
                </UButton>
                <UButton class="ms-auto" color="primary" icon="i-lucide-eye-off" @click="skip">
                    {{ t("review.wizard.keep") }} ⏎
                </UButton>
            </div>

            <UButton v-else block @click="emit('update:open', false)">
                {{ t("review.wizard.close") }}
            </UButton>
        </template>
    </UModal>
</template>
