<script lang="ts" setup>
const emit = defineEmits<{
    export: [format: "markdown" | "text" | "docx" | "clipboard"];
}>();

/** Write redactions as black bars rather than as their placeholder. */
const blackout = defineModel<boolean>("blackout", { default: false });

const { t } = useI18n();

const formats = [
    { format: "clipboard" as const, icon: "i-lucide-clipboard" },
    { format: "markdown" as const, icon: "i-lucide-file-text" },
    { format: "text" as const, icon: "i-lucide-file" },
    { format: "docx" as const, icon: "i-lucide-file-type" }
];

</script>

<template>
    <UPopover>
        <UButton
            icon="i-lucide-download"
            trailing-icon="i-lucide-chevron-down"
        >
            {{ t("export.export") }}
        </UButton>

        <template #content>
            <div class="flex w-72 flex-col gap-1 p-3">
                <!-- Which of the two the export writes is the one thing about
                     it a reader cannot take back, so it is asked here rather
                     than only implied by the preview's toggle. Both controls
                     hold the same setting, so the preview shows the answer. -->
                <span class="text-xs font-semibold uppercase tracking-wide text-muted">
                    {{ t("redactionStyle.title") }}
                </span>

                <UButton
                    v-for="style in REDACTION_STYLES"
                    :key="style.key"
                    block
                    :variant="blackout === style.blacked ? 'soft' : 'ghost'"
                    :color="blackout === style.blacked ? 'primary' : 'neutral'"
                    class="justify-start"
                    :trailing-icon="blackout === style.blacked ? 'i-lucide-check' : undefined"
                    :ui="{ trailingIcon: 'ms-auto' }"
                    @click="blackout = style.blacked"
                >
                    <template #leading>
                        <ReviewRedactionStyleMark :blacked="style.blacked" />
                    </template>

                    <span class="flex min-w-0 flex-col items-start">
                        <span>{{ t(`redactionStyle.${style.key}`) }}</span>
                        <span class="font-mono text-xs text-muted">
                            {{ t(`redactionStyle.${style.key}Example`) }}
                        </span>
                    </span>
                </UButton>

                <span class="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {{ t("export.formats.title") }}
                </span>

                <UButton
                    v-for="entry in formats"
                    :key="entry.format"
                    block
                    variant="ghost"
                    color="neutral"
                    class="justify-start"
                    :icon="entry.icon"
                    :label="t(`export.formats.${entry.format}`)"
                    @click="emit('export', entry.format)"
                />

                <p class="pt-1 text-xs text-dimmed">{{ t("export.hint") }}</p>
            </div>
        </template>
    </UPopover>
</template>
