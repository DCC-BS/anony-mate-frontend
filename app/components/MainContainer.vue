<script lang="ts" setup>
const { entities, entityTypes, redactedText, loadEntityTypes, applyRedact } = useRedact();

const inputText = ref("");

onMounted(async () => {
    await loadEntityTypes("default");
});

function redact() {
    applyRedact(inputText.value);
}
</script>

<template>
    <RedactOptions :entity-types="entityTypes" />

    <UTextarea v-model="inputText" />
    <UButton @click="redact">
        Redact
    </UButton>

    <RedactEditor :redacted-text="redactedText" :entities="entities" />
</template>
