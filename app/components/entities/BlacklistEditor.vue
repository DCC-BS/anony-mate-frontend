<script lang="ts" setup>
const props = defineProps<{ terms: string[] }>();
const emit = defineEmits<{ add: [term: string]; remove: [term: string] }>();

const { t } = useI18n();

const draft = ref("");

function add() {
    const term = draft.value.trim();
    if (!term || props.terms.includes(term)) {
        return;
    }
    emit("add", term);
    draft.value = "";
}
</script>

<template>
    <section class="flex min-h-0 flex-col gap-2">
        <div class="flex items-baseline justify-between">
            <h2 class="text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed">
                {{ t("entities.blacklist.title") }}
            </h2>
            <span class="text-meta tabular-nums text-dimmed">
                {{ t("entities.count", { count: props.terms.length }) }}
            </span>
        </div>

        <form class="flex gap-2" @submit.prevent="add">
            <UInput
                v-model="draft"
                size="sm"
                class="flex-1"
                :placeholder="t('entities.blacklist.placeholder')"
            />
            <UButton
                type="submit"
                icon="i-lucide-plus"
                size="sm"
                variant="soft"
                :title="t('entities.blacklist.add')"
                :aria-label="t('entities.blacklist.add')"
                :disabled="!draft.trim()"
            />
        </form>

        <div v-if="props.terms.length" class="min-h-0 flex-1 overflow-y-auto">
          <div class="flex flex-wrap gap-1.5">
            <UBadge
                v-for="term in props.terms"
                :key="term"
                variant="subtle"
                color="neutral"
                class="gap-1"
            >
                {{ term }}
                <UButton
                    icon="i-lucide-x"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :aria-label="t('entities.blacklist.remove')"
                    @click="emit('remove', term)"
                />
            </UBadge>
          </div>
        </div>

        <p v-else class="text-xs text-dimmed">{{ t("entities.blacklist.empty") }}</p>
    </section>
</template>
