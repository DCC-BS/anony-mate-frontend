<script setup lang="ts">
import AppFooter from '~/composables/AppFooter.vue';
import AppHeader from '~/composables/AppHeader.vue';

</script>


<template>
    <div class="h-screen grid grid-rows-[auto_minmax(0,1fr)_auto]">
        <AppHeader />
        <div class="px-4 py-2">
            <slot />
        </div>
        <AppFooter />
    </div>
</template>
