<script lang="ts" setup>
import type { DocumentView } from "~/composables/useDocumentReview";

const props = defineProps<{
    name: string;
    total: number;
    openCount: number;
}>();
const emit = defineEmits<{
    openWizard: [];
    export: [format: "markdown" | "text" | "docx" | "clipboard"];
}>();

const view = defineModel<DocumentView>("view", { default: "original" });

const { t } = useI18n();
const localePath = useLocalePath();

const viewItems = computed(() =>
    (["original", "anonymised", "blacked"] as const).map((value) => ({
        label: t(`review.view.${value}`),
        value
    }))
);
</script>

<template>
    <div class="flex flex-wrap items-center gap-2">
        <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-arrow-left"
            size="sm"
            :to="localePath('/documents')"
            :aria-label="t('review.back')"
        />

        <div class="min-w-0 flex-1">
            <h1 class="truncate text-[0.95rem] font-semibold text-highlighted">
                {{ props.name }}
            </h1>
            <p class="text-xs text-muted">
                {{ t("review.found", { count: props.total }) }}
                · {{ t("review.openCount", { count: props.openCount }) }}
            </p>
        </div>

        <UTabs
            v-model="view"
            :items="viewItems"
            :content="false"
            size="sm"
            :ui="{ trigger: 'text-[0.82rem]' }"
        />

        <UButton
            icon="i-lucide-wand-sparkles"
            variant="soft"
            size="sm"
            class="text-[0.82rem]"
            :disabled="props.openCount === 0"
            @click="emit('openWizard')"
        >
            {{ t("review.wizard.open", { count: props.openCount }) }}
        </UButton>

        <ReviewExportMenu :open-count="props.openCount" @export="emit('export', $event)" />
    </div>
</template>
