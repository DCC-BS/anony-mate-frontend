<script lang="ts" setup>
import type { ReviewTool } from "~/composables/useDocumentReview";

const props = defineProps<{
    /** Entity types this document was detected with. */
    labels: string[];
}>();

/** The tool in the reader's hand: picking words, marking them, or erasing. */
const tool = defineModel<ReviewTool>("tool", { default: "select" });
/** Entity type a mark is filed under, and the colour the ink takes. */
const markerLabel = defineModel<string>("markerLabel", { default: "" });

const { t } = useI18n();
const { entityName } = useEntityName();

const labelItems = computed(() =>
    props.labels.map((label) => ({ label: entityName(label), value: label }))
);

/** One palette slot, in the shape both the button and its tooltip read. */
function toolOf(
    value: ReviewTool,
    icon: string,
    name: string,
    key: string,
): { value: ReviewTool; icon: string; title: string; kbds: string[] } {
    return {
        value,
        icon,
        title: t(`review.marker.tool.${name}`),
        kbds: [key],
    };
}

const tools = computed(() => [
    toolOf("select", "i-lucide-mouse-pointer-2", "select", "v"),
    toolOf("mark", "i-lucide-highlighter", "mark", "m"),
    toolOf("erase", "i-lucide-eraser", "erase", "e"),
]);

// Palettes in drawing apps put a tool in the hand with a key, so the reader
// never leaves the text. Disabled while an input has focus, which keeps
// typing in the entity picker or the document search safe.
defineShortcuts({
    v: () => (tool.value = "select"),
    m: () => (tool.value = "mark"),
    e: () => (tool.value = "erase"),
});
</script>

<template>
    <!-- A palette rather than a toggle: the tools sit side by side, the one in
         the hand is lit, and the ink colour follows the type it will draw
         with. The type stays on screen whether marking is on or not — it says
         what the next mark will be filed as, and revealing it on toggle would
         shift everything beside it. -->
    <UFieldGroup size="sm">
        <UTooltip
            v-for="item in tools"
            :key="item.value"
            :text="item.title"
            :kbds="item.kbds"
        >
            <UButton
                :icon="item.icon"
                :variant="tool === item.value ? 'solid' : 'subtle'"
                color="neutral"
                :aria-pressed="tool === item.value"
                :aria-label="item.title"
                @click="tool = item.value"
            />
        </UTooltip>

        <USeparator orientation="vertical" class="mx-0.5" />

        <USelectMenu
            v-model="markerLabel"
            :items="labelItems"
            value-key="value"
            :disabled="tool === 'select'"
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