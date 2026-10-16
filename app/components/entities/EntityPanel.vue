<script lang="ts" setup>
import type { StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{
    types: StoredEntityType[];
    selected: string | null;
}>();
const emit = defineEmits<{
    select: [name: string];
    create: [];
}>();

const { t } = useI18n();
const { getEntityColor } = useEntityColor();

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
</script>

<template>
    <section
        id="entity-panel"
        class="flex min-h-0 flex-col gap-2 rounded-lg p-2 ring ring-default"
    >
        <div class="flex gap-2">
            <UInput
                v-model="query"
                icon="i-lucide-search"
                size="sm"
                class="flex-1"
                :placeholder="t('entities.searchTypes')"
                :ui="{ leadingIcon: 'translate-y-[1.5px]' }"
            />
            <UButton
                icon="i-lucide-plus"
                size="sm"
                variant="soft"
                :aria-label="t('entities.list.newType')"
                :title="t('entities.list.newType')"
                @click="emit('create')"
            />
        </div>

        <!-- Sizes to its content and only scrolls once it runs out of room. -->
        <div class="min-h-0 flex-1 overflow-y-auto">
            <button
                v-for="type in visible"
                :key="type.name"
                type="button"
                class="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left"
                :class="props.selected === type.name ? 'bg-elevated' : 'hover:bg-elevated'"
                @click="emit('select', type.name)"
            >
                <span class="flex items-center gap-2">
                    <span
                        class="size-2 flex-none rounded-full"
                        :style="{ background: getEntityColor(type.name).solid }"
                    />
                    <span class="truncate text-label font-medium text-highlighted">
                        {{ type.displayName || type.name }}
                    </span>
                    <span class="truncate font-mono text-meta text-dimmed">
                        {{ type.name }}
                    </span>
                </span>
                <span class="truncate pl-4 text-xs text-muted">
                    {{ type.description || t("entities.noDescription") }}
                </span>
            </button>

            <p v-if="!visible.length" class="p-4 text-center text-xs text-dimmed">
                {{ t("entities.noMatches") }}
            </p>
        </div>
    </section>
</template>
