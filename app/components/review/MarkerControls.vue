<script lang="ts" setup>
const props = defineProps<{
    /** Entity types this document was detected with. */
    labels: string[];
}>();

/** Marking mode: selected words become a detection of the chosen type. */
const marker = defineModel<boolean>("marker", { default: false });
const markerLabel = defineModel<string>("markerLabel", { default: "" });

const { t } = useI18n();
const { entityName } = useEntityName();

const labelItems = computed(() =>
    props.labels.map((label) => ({ label: entityName(label), value: label }))
);
</script>

<template>
    <!-- The type stays on screen whether marking is on or not: it says what the
         next mark will be filed as, and revealing it on toggle would shift
         everything beside it. -->
    <UFieldGroup>
        <UButton
            icon="i-lucide-highlighter"
            :variant="marker ? 'solid' : 'subtle'"
            :aria-pressed="marker"
            :title="t('review.marker.toggle')"
            :aria-label="t('review.marker.toggle')"
            @click="marker = !marker"
        />

        <USelectMenu
            v-model="markerLabel"
            :items="labelItems"
            value-key="value"
            :disabled="!marker"
            class="w-44"
            :search-input="{ placeholder: t('review.marker.search') }"
        >
            <template #leading>
                <EntityDot :label="markerLabel" />
            </template>

            <template #item-leading="{ item }">
                <EntityDot :label="item.value" />
            </template>
        </USelectMenu>
    </UFieldGroup>
</template>
