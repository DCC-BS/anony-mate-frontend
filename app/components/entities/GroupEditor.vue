<script lang="ts" setup>
import type { StoredEntityGroup, StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{ group: StoredEntityGroup; types: StoredEntityType[] }>();
const emit = defineEmits<{
    save: [group: StoredEntityGroup, patch: Partial<StoredEntityGroup>];
    remove: [group: StoredEntityGroup];
}>();

const { t } = useI18n();

const name = ref(props.group.name);

function flush() {
    const trimmed = name.value.trim();
    if (trimmed && trimmed !== props.group.name) {
        emit("save", props.group, { name: trimmed });
    }
}

function addLabel(label: string) {
    emit("save", props.group, { labels: [...props.group.labels, label] });
}

function removeLabel(label: string) {
    emit("save", props.group, {
        labels: props.group.labels.filter((entry) => entry !== label)
    });
}

function reorderLabels(labels: string[]) {
    emit("save", props.group, { labels });
}

onUnmounted(flush);
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
        <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-highlighted">{{ name }}</h2>
            <UBadge v-if="props.group.builtin" size="sm" variant="subtle" color="neutral">
                {{ t("entities.builtin") }}
            </UBadge>
        </div>

        <UFormField :label="t('entities.group.name')" class="max-w-sm">
            <UInput v-model="name" class="w-full" @blur="flush" />
        </UFormField>

        <div class="flex min-h-0 flex-col gap-2">
            <div class="text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed">
                {{ t("entities.group.membersHint") }}
            </div>
            <EntitiesMembershipPicker
                :types="props.types"
                :labels="props.group.labels"
                @add="addLabel"
                @remove="removeLabel"
                @reorder="reorderLabels"
            />
        </div>

        <div class="mt-auto flex items-center justify-between pt-2">
            <UButton
                v-if="!props.group.builtin"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="emit('remove', props.group)"
            >
                {{ t("entities.deleteGroup") }}
            </UButton>
            <span v-else />
            <span class="text-meta text-dimmed">
                {{ t("entities.editor.autoSave") }}
            </span>
        </div>
    </div>
</template>
