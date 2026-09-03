<script lang="ts" setup>
import type { DetectionState, StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    /** Entity types this document was detected with, for relabelling. */
    labels: string[];
}>();
const emit = defineEmits<{
    relabel: [id: string, label: string];
    setState: [id: string, state: DetectionState];
    setAllOccurrences: [text: string, state: DetectionState];
}>();

/**
 * The menu owns its own open state on purpose.
 *
 * Held on the document instead, opening the menu would touch a ref the
 * document's template reads, and Vue would redraw every one of its thousands
 * of detections before the menu appeared — the pause readers saw on each
 * right-click. Here the redraw is this component alone.
 */
const menu = useDetectionMenu(
    () => props.labels,
    {
        relabel: (id, label) => emit("relabel", id, label),
        setState: (id, state) => emit("setState", id, state),
        setAllOccurrences: (text, state) =>
            emit("setAllOccurrences", text, state),
    },
);

defineExpose({
    /** Opens the menu on a detection, at the pointer. */
    openAt: (event: MouseEvent, detection: StoredDetection) =>
        menu.openAt(event, detection),
});
</script>

<template>
    <!-- One menu for the whole document, placed where the reader clicked. -->
    <UDropdownMenu
        v-model:open="menu.open.value"
        :items="menu.items.value"
        :ui="{
            // Cap only a searchable list: the relabel submenu can carry every
            // entity type in the document, while the menu it opens from is
            // short and fixed and must not be cropped. The filter field is the
            // only thing that tells the two panels apart, and it sits outside
            // the viewport, so it stays put while the labels scroll.
            viewport:
                '[[data-slot=content]:has(input)>&]:max-h-40 [[data-slot=content]:has(input)>&]:overflow-y-auto'
        }"
    >
        <div
            class="fixed size-px"
            :style="{ left: `${menu.at.value.x}px`, top: `${menu.at.value.y}px` }"
        />

        <template #item-leading="{ item }">
            <EntityDot v-if="menu.labelOf(item)" :label="menu.labelOf(item)" />
        </template>
    </UDropdownMenu>
</template>
