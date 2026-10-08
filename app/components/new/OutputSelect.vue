<script lang="ts" setup>
/**
 * What a PDF upload is worked for: reviewed here over the original, or
 * turned into text. Pasted text has no choice to make.
 */
const pdfReview = defineModel<boolean>({ default: false });

const { t } = useI18n();

const options = [
    {
        value: "pdf" as const,
        label: "new.output.pdfReview",
        hint: "new.output.pdfReviewHint",
        help: "new.output.pdfReviewHelp",
    },
    {
        value: "text" as const,
        label: "new.output.textReview",
        hint: "new.output.textReviewHint",
        help: "new.output.textReviewHelp",
    },
];

const selected = computed({
    get: () => (pdfReview.value ? "pdf" : "text"),
    set: (value: string) => {
        pdfReview.value = value === "pdf";
    },
});

const active = computed(() => options.find((option) => option.value === selected.value));
</script>

<template>
    <div class="flex flex-col gap-2.5">
        <div class="text-sm font-semibold text-highlighted">
            {{ t("new.output.title") }}
        </div>

        <UFieldGroup class="w-full">
            <UButton
                v-for="option in options"
                :key="option.value"
                block
                :variant="selected === option.value ? 'soft' : 'ghost'"
                :color="selected === option.value ? 'primary' : 'neutral'"
                :aria-pressed="selected === option.value"
                @click="selected = option.value"
            >
                {{ t(option.label) }}
            </UButton>
        </UFieldGroup>

        <p class="text-xs text-muted">
            {{ t(active?.hint ?? "") }}
        </p>

        <UPopover mode="hover" :content="{ side: 'left', align: 'start' }">
            <UButton
                icon="i-lucide-circle-help"
                variant="ghost"
                color="neutral"
                size="xs"
                :aria-label="t(active?.help ?? '')"
            />
            <template #content>
                <p class="max-w-80 p-3 text-xs leading-relaxed text-default">
                    {{ t(active?.help ?? "") }}
                </p>
            </template>
        </UPopover>
    </div>
</template>