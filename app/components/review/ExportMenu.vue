<script lang="ts" setup>
const props = defineProps<{ openCount: number }>();
const emit = defineEmits<{
    export: [format: "markdown" | "text" | "docx" | "clipboard"];
}>();

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
            <div class="flex w-64 flex-col gap-1 p-3">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted">
                    {{ t("export.formats.title") }}
                </span>

                <p v-if="props.openCount" class="pb-1 text-xs text-warning">
                    {{ t("export.openWarning", { count: props.openCount }) }}
                </p>

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
