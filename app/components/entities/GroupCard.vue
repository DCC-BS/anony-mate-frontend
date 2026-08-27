<script lang="ts" setup>
import type { StoredEntityGroup, StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{
    group: StoredEntityGroup;
    types: StoredEntityType[];
}>();
const emit = defineEmits<{
    update: [group: StoredEntityGroup];
    remove: [groupId: string];
}>();

const { t } = useI18n();
const { getEntityColor } = useEntityColor();

/** USelectMenu brings its own search and scrolling for long type lists. */
const labels = computed({
    get: () => props.group.labels,
    set: (value: string[]) => emit("update", { ...props.group, labels: value })
});

const options = computed(() => props.types.map((type) => type.name));
</script>

<template>
    <UCard :ui="{ body: 'p-3 flex flex-col gap-2' }">
        <div class="flex items-baseline justify-between gap-2">
            <span class="truncate text-[0.82rem] font-semibold text-highlighted">
                {{ props.group.name }}
            </span>

            <div class="flex items-center gap-1">
                <span class="text-[0.7rem] tabular-nums text-dimmed">
                    {{ t("entities.groupEntities", { count: props.group.labels.length }) }}
                </span>
                <UButton
                    v-if="!props.group.builtin"
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="xs"
                    :title="t('entities.deleteGroup')"
                    @click="emit('remove', props.group.id)"
                />
            </div>
        </div>

        <USelectMenu
            v-model="labels"
            :items="options"
            multiple
            searchable
            size="xs"
            :placeholder="t('entities.selectTypes')"
            :search-input="{ placeholder: t('entities.searchTypes') }"
        />

        <div v-if="props.group.labels.length" class="flex flex-wrap gap-1">
            <span
                v-for="label in props.group.labels"
                :key="label"
                class="flex items-center gap-1.5 rounded-full border border-accented px-2 py-0.5 text-[0.7rem]"
            >
                <span
                    class="size-1.5 rounded-full"
                    :style="{ background: getEntityColor(label).solid }"
                />
                {{ label }}
            </span>
        </div>
    </UCard>
</template>
