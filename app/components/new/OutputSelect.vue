<script lang="ts" setup>
/** Whether PDFs come back marked for redaction instead of as text to review. */
const markedPdf = defineModel<boolean>({ default: false });

const { t } = useI18n();
</script>

<template>
    <div class="flex flex-col gap-2.5">
        <div class="text-sm font-semibold text-highlighted">
            {{ t("new.output.title") }}
        </div>

        <div class="flex items-start justify-between gap-2">
            <USwitch
                v-model="markedPdf"
                :label="t('new.output.markedPdf')"
                :description="t('new.output.markedPdfHint')"
                :ui="{ label: 'text-sm', description: 'text-xs' }"
            />

            <UPopover mode="hover" :content="{ side: 'left', align: 'start' }">
                <UButton
                    icon="i-lucide-circle-help"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :aria-label="t('new.output.markedPdfHelpLabel')"
                />
                <template #content>
                    <p class="max-w-80 p-3 text-xs leading-relaxed text-default">
                        {{ t("new.output.markedPdfHelp") }}
                    </p>
                </template>
            </UPopover>
        </div>
    </div>
</template>
