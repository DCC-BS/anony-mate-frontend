<script lang="ts" setup>
import type { StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{ types: StoredEntityType[]; labels: string[] }>();
const emit = defineEmits<{
    add: [label: string];
    remove: [label: string];
    /** The labels array in its new order after a member was dropped onto another. */
    reorder: [labels: string[]];
}>();

const { t } = useI18n();

const query = ref("");

const { entityName } = useEntityName();

const memberNames = computed(() => new Set(props.labels));

const available = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return props.types
        .filter((type) => !memberNames.value.has(type.name))
        .filter(
            (type) =>
                !needle ||
                type.name.toLowerCase().includes(needle) ||
                type.displayName.toLowerCase().includes(needle)
        );
});

const members = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return props.labels
        .map((label) => props.types.find((type) => type.name === label) ?? null)
        .filter((type): type is StoredEntityType => type !== null)
        .filter(
            (type) =>
                !needle ||
                type.name.toLowerCase().includes(needle) ||
                type.displayName.toLowerCase().includes(needle)
        );
});

// --- drag & drop -----------------------------------------------------------

const dragging = ref<string | null>(null);
const dragOver = ref<"available" | "members" | null>(null);

function onDragStart(label: string, event: DragEvent) {
    dragging.value = label;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", label);
    }
}

function onDragEnd() {
    dragging.value = null;
    dragOver.value = null;
}

function onDropAvailable() {
    const label = dragging.value;
    if (label && props.labels.includes(label)) {
        emit("remove", label);
    }
    onDragEnd();
}

function onDropMembers() {
    const label = dragging.value;
    if (label && !props.labels.includes(label)) {
        emit("add", label);
    }
    onDragEnd();
}

/** Drops a dragged member onto another member row: moves it before the target. */
function onDropMemberRow(target: string) {
    const label = dragging.value;
    if (label && label !== target && props.labels.includes(label)) {
        const next = props.labels.filter((entry) => entry !== label);
        next.splice(next.indexOf(target), 0, label);
        emit("reorder", next);
    }
    onDragEnd();
}
</script>

<template>
    <div class="grid h-72 grid-cols-2 gap-3">
        <fieldset
            :aria-label="t('entities.membership.available')"
            class="flex min-h-0 flex-col rounded-lg ring transition-colors"
            :class="dragOver === 'available' ? 'bg-elevated ring-accented' : 'ring-default'"
            @dragover.prevent="dragOver = 'available'"
            @drop.prevent="onDropAvailable"
        >
            <div
                class="flex items-center justify-between border-b border-default px-3 py-2 text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed"
            >
                <span>{{ t("entities.membership.available") }}</span>
                <span class="tabular-nums">{{ available.length }}</span>
            </div>
            <div class="px-2 pt-2">
                <UInput
                    v-model="query"
                    icon="i-lucide-search"
                    size="xs"
                    class="w-full"
                    :placeholder="t('entities.membership.filter')"
                    :ui="{ leadingIcon: 'translate-y-[1.5px]' }"
                />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto p-2">
                <li
                    v-for="type in available"
                    :key="type.name"
                    class="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1 hover:bg-elevated"
                    :class="dragging === type.name ? 'opacity-40' : ''"
                    draggable="true"
                    @dragstart="onDragStart(type.name, $event)"
                    @dragend="onDragEnd"
                >
                    <span class="truncate text-label">{{ entityName(type.name) }}</span>
                    <span class="truncate font-mono text-meta text-dimmed">{{ type.name }}</span>
                    <UButton
                        class="ml-auto opacity-0 group-hover:opacity-100"
                        icon="i-lucide-plus"
                        size="xs"
                        variant="ghost"
                        :aria-label="t('entities.membership.add', { name: entityName(type.name) })"
                        @click="emit('add', type.name)"
                    />
                </li>
                <li v-if="!available.length" class="p-3 text-center text-xs text-dimmed">
                    {{ t("entities.membership.emptyAvailable") }}
                </li>
            </ul>
        </fieldset>

        <fieldset
            :aria-label="t('entities.membership.inGroup')"
            class="flex min-h-0 flex-col rounded-lg ring transition-colors"
            :class="dragOver === 'members' ? 'bg-elevated ring-accented' : 'ring-default'"
            @dragover.prevent="dragOver = 'members'"
            @drop.prevent="onDropMembers"
        >
            <div
                class="flex items-center justify-between border-b border-default px-3 py-2 text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed"
            >
                <span>{{ t("entities.membership.inGroup") }}</span>
                <span class="tabular-nums">{{ props.labels.length }}</span>
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto p-2">
                <li
                    v-for="type in members"
                    :key="type.name"
                    class="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1 hover:bg-elevated"
                    :class="dragging === type.name ? 'opacity-40' : ''"
                    draggable="true"
                    @dragstart="onDragStart(type.name, $event)"
                    @dragend="onDragEnd"
                    @drop.prevent.stop="onDropMemberRow(type.name)"
                >
                    <span class="truncate text-label">{{ entityName(type.name) }}</span>
                    <span class="truncate font-mono text-meta text-dimmed">{{ type.name }}</span>
                    <UButton
                        class="ml-auto opacity-0 group-hover:opacity-100"
                        icon="i-lucide-x"
                        size="xs"
                        variant="ghost"
                        color="error"
                        :aria-label="t('entities.membership.remove', { name: entityName(type.name) })"
                        @click="emit('remove', type.name)"
                    />
                </li>
                <li v-if="!members.length" class="p-3 text-center text-xs text-dimmed">
                    {{ t("entities.membership.emptyMembers") }}
                </li>
            </ul>
        </fieldset>
    </div>
</template>
