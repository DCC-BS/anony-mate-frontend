<script lang="ts" setup>
import type { StoredEntityGroup } from "~/types/storedEntity";

const { t } = useI18n();

const {
    groups,
    types,
    blacklist,
    saveType,
    renameType,
    deleteType,
    saveGroup,
    deleteGroup,
    addBlacklistTerm,
    removeBlacklistTerm
} = useEntityGroups();

const sortedGroups = computed(() =>
    [...groups.value].sort(
        (a, b) => Number(b.builtin) - Number(a.builtin) || a.name.localeCompare(b.name)
    )
);

function createGroup(name: string) {
    return saveGroup({ name, description: "", labels: [], builtin: false });
}

function updateGroup(group: StoredEntityGroup) {
    return saveGroup(group);
}
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
        <div>
            <h1 class="text-xl font-bold text-highlighted">{{ t("entities.title") }}</h1>
        </div>

        <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <EntitiesEntityPanel
                :types="types"
                @save="saveType"
                @rename="renameType"
                @remove="deleteType"
            />

            <div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
                <EntitiesGroupPanel
                    :groups="sortedGroups"
                    :types="types"
                    @create="createGroup"
                    @update="updateGroup"
                    @remove="deleteGroup"
                />

                <EntitiesBlacklistEditor
                    :terms="blacklist"
                    @add="addBlacklistTerm"
                    @remove="removeBlacklistTerm"
                />
            </div>
        </div>
    </div>
</template>
