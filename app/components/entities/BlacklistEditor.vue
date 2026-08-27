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
    <UCard :ui="{ body: 'flex flex-col gap-3' }">
        <div>
            <div class="text-sm font-semibold text-highlighted">
                {{ t("entities.blacklist.title") }}
            </div>
        </div>

        <form class="flex gap-2" @submit.prevent="add">
            <UInput
                v-model="draft"
                size="sm"
                class="flex-1"
                :placeholder="t('entities.blacklist.placeholder')"
            />
            <UButton type="submit" size="sm" variant="soft" :disabled="!draft.trim()">
                {{ t("entities.blacklist.add") }}
            </UButton>
        </form>

        <div v-if="props.terms.length" class="flex flex-wrap gap-1.5">
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

        <p v-else class="text-xs text-dimmed">{{ t("entities.blacklist.empty") }}</p>
    </UCard>
</template>
