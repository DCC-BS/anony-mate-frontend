<script lang="ts" setup>

interface InputProps {
    redactedText: string,
    entities: Record<string, Entity[]>
}

const props = defineProps<InputProps>();
</script>


<template>

<UTextarea v-model="props.redactedText" readonly>
</UTextarea>

</template>
