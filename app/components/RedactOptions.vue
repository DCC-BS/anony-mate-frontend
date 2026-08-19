<script setup lang="ts">
interface InputProps {
    entityTypes: Record<string, string>;
}

const props = defineProps<InputProps>();
</script>

<template>

    <div v-for="(label, desc) in props.entityTypes" :key="label">
        <span>{{ label }}</span>
        <input type="text" :placeholder="desc" />
    </div>
</template>
