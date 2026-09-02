<script lang="ts" setup>
const props = defineProps<{
    /** Entity type whose colour the dot shows. */
    label?: string;
}>();

const { getEntityColor } = useEntityColor();
</script>

<template>
    <span
        class="size-2 shrink-0 self-center rounded-full"
        :style="{ background: getEntityColor(props.label ?? '').solid }"
    />
</template>
