<script lang="ts" setup>
import type { StoredEntityGroup, StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{
    groups: StoredEntityGroup[];
    types: StoredEntityType[];
}>();
const emit = defineEmits<{
    create: [name: string];
    update: [group: StoredEntityGroup];
    remove: [groupId: string];
}>();

const { t } = useI18n();

const query = ref("");

const visible = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return needle
        ? props.groups.filter((group) =>
              group.name.toLowerCase().includes(needle)
          )
        : props.groups;
});

const addFields = computed(() => [
    {
        key: "name",
        label: t("entities.newGroup.name"),
        placeholder: t("entities.newGroup.placeholder")
    }
]);

function create(values: Record<string, string>) {
    emit("create", values.name as string);
}
</script>

<template>
    <section class="flex min-h-0 flex-col gap-2">
        <div class="flex items-baseline justify-between">
            <h2 class="text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed">
                {{ t("entities.groupsTitle") }}
            </h2>
            <span class="text-meta tabular-nums text-dimmed">
                {{ t("entities.count", { count: props.groups.length }) }}
            </span>
        </div>

        <div class="flex gap-2">
            <UInput
                v-model="query"
                icon="i-lucide-search"
                size="sm"
                class="flex-1"
                :placeholder="t('entities.searchGroups')"
            />

            <EntitiesAddPopover
                :title="t('entities.newGroup.title')"
                :fields="addFields"
                @submit="create"
            />
        </div>

        <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
            <EntitiesGroupCard
                v-for="group in visible"
                :key="group.id"
                :group="group"
                :types="props.types"
                @update="emit('update', $event)"
                @remove="emit('remove', $event)"
            />

            <p v-if="!visible.length" class="p-6 text-center text-xs text-dimmed">
                {{ t("entities.noMatches") }}
            </p>
        </div>

    </section>
</template>
