<script lang="ts" setup>
import type { StoredEntityGroup, StoredEntityType } from "~/types/storedEntity";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const {
    groups,
    types,
    blacklist,
    saveType: persistType,
    renameType,
    deleteType: persistDeleteType,
    saveGroup: persistGroup,
    deleteGroup: persistDeleteGroup,
    addBlacklistTerm,
    removeBlacklistTerm
} = useEntityGroups();

// --- tabs (deep-linkable, the onboarding tour walks them one by one) --------

const TABS = ["types", "groups", "blacklist"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: unknown): value is Tab {
    return typeof value === "string" && (TABS as readonly string[]).includes(value);
}

const tab = ref<Tab>(isTab(route.query.tab) ? route.query.tab : "types");

watch(tab, (value) => {
    router.replace({ query: { ...route.query, tab: value === "types" ? undefined : value } });
});

watch(
    () => route.query.tab,
    (value) => {
        if (isTab(value) && value !== tab.value) {
            tab.value = value;
        }
    }
);

const tabItems = computed(() => [
    { label: `${t("entities.typesTitle")} (${types.value.length})`, value: "types" as const },
    { label: `${t("entities.groupsTitle")} (${groups.value.length})`, value: "groups" as const },
    { label: `${t("entities.blacklist.title")} (${blacklist.value.length})`, value: "blacklist" as const }
]);

// --- entity types -----------------------------------------------------------

/**
 * A fresh type lives only in memory until its first save, so abandoning the
 * editor leaves no "new-type" row behind. The editor keeps editing the draft
 * object itself — swapping in the stored row would unmount it mid-keystroke —
 * so `draftPersistedName` tracks the row the draft has come to own.
 */
const draftType = ref<StoredEntityType | null>(null);
const draftPersistedName = ref<string | null>(null);
const selectedTypeName = ref<string | null>(null);

const selectedType = computed<StoredEntityType | null>(() => {
    if (draftType.value) {
        return draftType.value;
    }
    return types.value.find((type) => type.name === selectedTypeName.value) ?? null;
});

function createType() {
    let name = "new-type";
    for (let n = 2; types.value.some((entry) => entry.name === name); n += 1) {
        name = `new-type-${n}`;
    }
    draftType.value = {
        name,
        displayName: "",
        description: "",
        replacement: DEFAULT_REPLACEMENT,
        builtin: false,
        customised: false
    };
    draftPersistedName.value = null;
    selectedTypeName.value = null;
}

function selectType(name: string) {
    draftType.value = null;
    draftPersistedName.value = null;
    selectedTypeName.value = name;
}

async function saveTypeFromEditor(type: StoredEntityType, patch: Partial<StoredEntityType>) {
    if (draftType.value === type) {
        const newName = typeof patch.name === "string" ? patch.name : type.name;
        // A collision is another type under that name — not the draft's own
        // row, which has been in the store since its first save.
        const collides = types.value.some(
            (entry) => entry.name === newName && entry.name !== draftPersistedName.value
        );
        if (collides) {
            return;
        }
        if (draftPersistedName.value && draftPersistedName.value !== newName) {
            await renameType(draftPersistedName.value, newName);
        }
        draftPersistedName.value ??= newName;
        await persistType({ ...type, ...patch, name: newName });
        draftType.value = { ...type, ...patch, name: newName };
        return;
    }
    // Merge into the store's current row, not the prop snapshot: a fast
    // follow-up save would otherwise resurrect pre-save fields.
    const current = types.value.find((entry) => entry.name === type.name);
    if (!current) {
        return; // deleted while the editor was flushing
    }
    const newName = typeof patch.name === "string" && patch.name !== current.name ? patch.name : null;
    if (newName) {
        await renameType(current.name, newName);
        selectedTypeName.value = newName;
    }
    await persistType({ ...current, ...patch, name: newName ?? current.name });
}

async function deleteTypeFromEditor(type: StoredEntityType) {
    if (draftType.value === type) {
        if (draftPersistedName.value) {
            await persistDeleteType(draftPersistedName.value);
        }
        draftType.value = null;
        draftPersistedName.value = null;
        return;
    }
    await persistDeleteType(type.name);
    if (selectedTypeName.value === type.name) {
        selectedTypeName.value = null;
    }
}

// --- detection groups --------------------------------------------------------

const selectedGroupId = ref<string | null>(null);

const sortedGroups = computed(() =>
    [...groups.value].sort(
        (a, b) => Number(b.builtin) - Number(a.builtin) || a.name.localeCompare(b.name)
    )
);

const selectedGroup = computed<StoredEntityGroup | null>(
    () => groups.value.find((group) => group.id === selectedGroupId.value) ?? null
);

async function createGroup() {
    const stored = await persistGroup({
        name: t("entities.newGroup.name"),
        description: "",
        labels: [],
        builtin: false
    });
    selectedGroupId.value = stored.id;
}

async function saveGroupFromEditor(group: StoredEntityGroup, patch: Partial<StoredEntityGroup>) {
    // Merge into the store's current row, not the prop snapshot: a fast
    // follow-up save would otherwise resurrect pre-save fields.
    const current = groups.value.find((entry) => entry.id === group.id);
    if (!current) {
        return; // deleted while the editor was flushing
    }
    const stored = await persistGroup({ ...current, ...patch });
    selectedGroupId.value = stored.id;
}

async function deleteGroupFromEditor(group: StoredEntityGroup) {
    await persistDeleteGroup(group.id);
    if (selectedGroupId.value === group.id) {
        selectedGroupId.value = null;
    }
}
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
        <div>
            <h1 class="text-xl font-bold text-highlighted">{{ t("entities.title") }}</h1>
        </div>

        <UTabs
            v-model="tab"
            :items="tabItems"
            :content="false"
            size="sm"
            class="self-start"
        />

        <div
            v-if="tab === 'types'"
            class="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)] gap-4"
        >
            <EntitiesEntityPanel
                :types="types"
                :selected="draftType ? null : selectedTypeName"
                @select="selectType"
                @create="createType"
            />

            <div class="min-h-0 rounded-lg ring ring-default">
                <EntitiesTypeEditor
                    v-if="selectedType"
                    :key="selectedType.name"
                    :type="selectedType"
                    @save="saveTypeFromEditor"
                    @remove="deleteTypeFromEditor"
                />
                <div
                    v-else
                    class="grid h-full place-items-center p-4 text-center text-sm text-dimmed"
                >
                    {{ t("entities.list.emptyTypeSelection") }}
                </div>
            </div>
        </div>

        <div
            v-else-if="tab === 'groups'"
            class="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)] gap-4"
        >
            <EntitiesGroupPanel
                :groups="sortedGroups"
                :selected="selectedGroupId"
                @select="(id) => (selectedGroupId = id)"
                @create="createGroup"
            />

            <div class="min-h-0 rounded-lg ring ring-default">
                <EntitiesGroupEditor
                    v-if="selectedGroup"
                    :key="selectedGroup.id"
                    :group="selectedGroup"
                    :types="types"
                    @save="saveGroupFromEditor"
                    @remove="deleteGroupFromEditor"
                />
                <div
                    v-else
                    class="grid h-full place-items-center p-4 text-center text-sm text-dimmed"
                >
                    {{ t("entities.list.emptyGroupSelection") }}
                </div>
            </div>
        </div>

        <div v-else class="mx-auto w-full max-w-2xl">
            <EntitiesTermsEditor
                :terms="blacklist"
                @add="addBlacklistTerm"
                @remove="removeBlacklistTerm"
            />
        </div>
    </div>
</template>
