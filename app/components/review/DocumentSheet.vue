<script lang="ts" setup>
const props = defineProps<{
    /** Page number, 1-based. */
    page: number;
    /** Character offset the page starts at; the scroll anchor is named for it. */
    start: number;
    /** Single-page documents do not need to say which page this is. */
    numbered?: boolean;
}>();

const { t } = useI18n();
</script>

<template>
    <!-- One sheet of the document, in both views: the same paper, the same
         anchors, whatever is printed on it. -->
    <section
        :id="`page-${props.start}`"
        :data-page="props.page"
        :data-page-start="props.start"
        class="rounded-sm border border-default bg-default px-12 py-12 text-sm leading-relaxed shadow-sheet"
    >
        <slot />

        <div
            v-if="props.numbered"
            class="mt-10 border-t border-default pt-3 text-center text-eyebrow uppercase tracking-wider text-dimmed"
        >
            {{ t("review.page", { page: props.page }) }}
        </div>
    </section>
</template>
