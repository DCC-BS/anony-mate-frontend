<script lang="ts" setup>
import type { StoredEntityGroup } from "~/types/storedEntity";

const props = defineProps<{ groups: StoredEntityGroup[] }>();

const selected = defineModel<string | undefined>();

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
    <div class="flex flex-col gap-2.5">
        <div>
            <div class="text-sm font-semibold text-highlighted">
                {{ t("new.group.title") }}
            </div>
        </div>

        <URadioGroup
            v-model="selected"
            :items="props.groups.map((group) => ({
                label: group.name,
                description: t('new.group.entityCount', { count: group.labels.length }),
                value: group.id
            }))"
            variant="card"
            :ui="{ item: 'p-2.5', label: 'text-sm', description: 'text-xs' }"
        />

        <UButton
            variant="link"
            size="xs"
            color="neutral"
            icon="i-lucide-settings-2"
            class="self-start px-0"
            :to="localePath('/entities')"
        >
            {{ t("new.group.manage") }}
        </UButton>
    </div>
</template>
