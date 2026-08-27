<script lang="ts" setup>
import type { StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{ types: StoredEntityType[] }>();
const emit = defineEmits<{
    save: [type: StoredEntityType];
    rename: [oldName: string, newName: string];
    remove: [name: string];
}>();

const { t } = useI18n();
const replacementTokens = useReplacementTokens();

const query = ref("");

const visible = computed(() => {
    const needle = query.value.trim().toLowerCase();
    const sorted = [...props.types].sort((a, b) => a.name.localeCompare(b.name));

    return needle
        ? sorted.filter(
              (type) =>
                  type.name.toLowerCase().includes(needle) ||
                  type.description.toLowerCase().includes(needle)
          )
        : sorted;
});

const addFields = computed(() => [
    {
        key: "name",
        label: t("entities.newType.name"),
        placeholder: t("entities.newType.namePlaceholder")
    },
    {
        key: "description",
        label: t("entities.newType.description"),
        placeholder: t("entities.newType.descriptionPlaceholder")
    },
    {
        key: "replacement",
        label: t("entities.replacement.label"),
        hint: replacementTokens.value
            .map((entry) => `${entry.placeholder} ${entry.description}`)
            .join(" · "),
        default: DEFAULT_REPLACEMENT
    }
]);

function create(values: Record<string, string>) {
    emit("save", {
        name: values.name as string,
        description: values.description ?? "",
        replacement: values.replacement || DEFAULT_REPLACEMENT,
        builtin: false
    });
}
</script>

<template>
    <section class="flex min-h-0 flex-col gap-2">
        <div class="flex items-baseline justify-between">
            <h2 class="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-dimmed">
                {{ t("entities.typesTitle") }}
            </h2>
            <span class="text-[0.7rem] tabular-nums text-dimmed">
                {{ t("entities.count", { count: props.types.length }) }}
            </span>
        </div>

        <div class="flex gap-2">
            <UInput
                v-model="query"
                icon="i-lucide-search"
                size="sm"
                class="flex-1"
                :placeholder="t('entities.searchTypes')"
            />

            <EntitiesAddPopover
                :title="t('entities.newType.title')"
                :fields="addFields"
                @submit="create"
            />
        </div>

        <!-- Sizes to its content and only scrolls once it runs out of room, so
             a short list does not leave a large empty card behind. -->
        <UCard
            class="flex min-h-0 flex-col overflow-hidden ring ring-default"
            :ui="{ body: 'min-h-0 flex-1 p-0 sm:p-0 overflow-y-auto' }"
        >
            <div>
                <EntitiesEntityRow
                    v-for="type in visible"
                    :key="type.name"
                    :type="type"
                    @save="emit('save', $event)"
                    @rename="(oldName, name) => emit('rename', oldName, name)"
                    @remove="emit('remove', $event)"
                />

                <p v-if="!visible.length" class="p-6 text-center text-xs text-dimmed">
                    {{ t("entities.noMatches") }}
                </p>
            </div>
        </UCard>

    </section>
</template>
