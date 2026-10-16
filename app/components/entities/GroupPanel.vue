<script lang="ts" setup>
import type { StoredEntityGroup } from "~/types/storedEntity";

const props = defineProps<{
    groups: StoredEntityGroup[];
    selected: string | null;
}>();
const emit = defineEmits<{
    select: [id: string];
    create: [];
}>();

const { t } = useI18n();
const { groupName } = useGroupName();

const query = ref("");

const visible = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return needle
        ? props.groups.filter((group) =>
              groupName(group).toLowerCase().includes(needle)
          )
        : props.groups;
});
</script>

<template>
    <section
        id="group-panel"
        class="flex min-h-0 flex-col gap-2 rounded-lg p-2 ring ring-default"
    >
        <div class="flex gap-2">
            <UInput
                v-model="query"
                icon="i-lucide-search"
                size="sm"
                class="flex-1"
                :placeholder="t('entities.searchGroups')"
                :ui="{ leadingIcon: 'translate-y-[1.5px]' }"
            />
            <UButton
                icon="i-lucide-plus"
                size="sm"
                variant="soft"
                :aria-label="t('entities.list.newGroup')"
                :title="t('entities.list.newGroup')"
                @click="emit('create')"
            />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
            <button
                v-for="group in visible"
                :key="group.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
                :class="props.selected === group.id ? 'bg-elevated' : 'hover:bg-elevated'"
                @click="emit('select', group.id)"
            >
                <span class="truncate text-label font-medium text-highlighted">
                    {{ groupName(group) }}
                </span>
                <span class="ml-auto text-meta tabular-nums text-dimmed">
                    {{ group.labels.length }}
                </span>
            </button>

            <p v-if="!visible.length" class="p-4 text-center text-xs text-dimmed">
                {{ t("entities.noMatches") }}
            </p>
        </div>
    </section>
</template>
