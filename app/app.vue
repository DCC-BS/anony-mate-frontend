<script lang="ts" setup>
// The tour visits several pages itself, so it is built here instead of on one.
const onboardingBuilder = useAnonymateTour();
</script>

<template>
    <UApp>
        <FirstRunOrchestrator :onboarding-builder="onboardingBuilder" />
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
