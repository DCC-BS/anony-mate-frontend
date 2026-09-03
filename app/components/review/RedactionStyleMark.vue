<script lang="ts" setup>
defineProps<{ blacked: boolean }>();
</script>

<template>
    <!-- Lucide draws its rectangles as outlines, and an outlined box is the one
         thing a blackout is not. The bar is black rather than the button's own
         colour, which would turn it white on the selected button — a white bar
         is exactly the wrong picture. The hairline keeps its edge on a dark
         surface, where black on black would disappear. -->
    <span
        v-if="blacked"
        class="my-auto h-2.5 w-4 shrink-0 rounded-[2px] bg-black ring-1 ring-inset ring-white/30"
    />

    <UIcon v-else name="i-lucide-baseline" class="size-5 shrink-0" />
</template>
