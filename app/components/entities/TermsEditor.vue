<script lang="ts" setup>
const props = defineProps<{ terms: string[] }>();
const emit = defineEmits<{ add: [term: string]; remove: [term: string] }>();

const { t } = useI18n();

const draft = ref("");
const query = ref("");

const visible = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return needle
        ? props.terms.filter((term) => term.toLowerCase().includes(needle))
        : props.terms;
});

function submit() {
    const term = draft.value.trim();
    if (!term || props.terms.includes(term)) {
        return;
    }
    emit("add", term);
    draft.value = "";
}
</script>

<template>
    <section
        id="blacklist-editor"
        class="flex flex-col gap-3 rounded-lg p-4 ring ring-default"
    >
        <div class="flex items-baseline justify-between">
            <h2 class="text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed">
                {{ t("entities.blacklist.title") }}
            </h2>
            <span class="text-meta tabular-nums text-dimmed">{{ props.terms.length }}</span>
        </div>

        <form class="flex gap-2" @submit.prevent="submit">
            <UInput
                v-model="draft"
                size="lg"
                class="flex-1"
                :placeholder="t('entities.blacklist.placeholder')"
            />
            <UButton
                type="submit"
                icon="i-lucide-plus"
                size="lg"
                variant="soft"
                :aria-label="t('entities.blacklist.add')"
                :disabled="!draft.trim()"
            />
        </form>

        <UInput
            v-if="props.terms.length"
            v-model="query"
            icon="i-lucide-search"
            size="sm"
            :placeholder="t('entities.terms.search', { count: props.terms.length })"
            :ui="{ leadingIcon: 'translate-y-[1.5px]' }"
        />

        <div
            v-if="props.terms.length"
            class="divide-y divide-default rounded-lg ring ring-default"
        >
            <div
                v-for="term in visible"
                :key="term"
                class="group flex items-center gap-3 px-3 py-2 hover:bg-elevated"
            >
                <span class="truncate text-sm">{{ term }}</span>
                <UButton
                    class="ml-auto opacity-0 group-hover:opacity-100"
                    icon="i-lucide-x"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :aria-label="t('entities.blacklist.remove')"
                    @click="emit('remove', term)"
                />
            </div>

            <p v-if="!visible.length" class="p-4 text-center text-sm text-dimmed">
                {{ t("entities.terms.noMatch", { query }) }}
            </p>
        </div>
        <p v-else class="text-sm text-dimmed">{{ t("entities.blacklist.empty") }}</p>
    </section>
</template>
