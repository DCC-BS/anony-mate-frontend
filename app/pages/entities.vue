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

        <!-- Entities need the room to read a description; the groups and the
             never-redact list are both short lines, so they get a column each
             rather than sharing one and pushing the other out of view. -->
        <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_var(--width-entities-column)_var(--width-entities-column)]">
            <EntitiesEntityPanel
                :types="types"
                @save="saveType"
                @rename="renameType"
                @remove="deleteType"
            />

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
</template>
