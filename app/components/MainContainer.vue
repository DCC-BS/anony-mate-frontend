<script lang="ts" setup>
import type { EntityTypePreset } from "~~/shared/types/redactTypes";

const { t } = useI18n();
const toast = useToast();

const {
    preset,
    types,
    threshold,
    blacklist,
    isDirty,
    entities,
    entityTypesPayload,
    isLoadingTypes,
    isRedacting,
    loadPreset,
    addCustomType,
    removeCustomType,
    applyRedact
} = useRedact();

const inputText = ref("");
const reviewDirty = ref(false);
const rerunConfirmOpen = ref(false);

const availableTypes = computed(() => Object.keys(entityTypesPayload.value));

const hasInput = computed(() => inputText.value.trim().length > 0);

const wordCount = computed(() =>
    inputText.value.trim() ? inputText.value.trim().split(/\s+/).length : 0
);

onMounted(async () => {
    try {
        await loadPreset("default");
    } catch {
        toast.add({
            title: t("redact.toast.loadErrorTitle"),
            description: t("redact.toast.loadErrorDescription"),
            color: "error"
        });
    }
});

watch(preset, (next) => {
    if (!next) {
        return;
    }
    loadPreset(next).catch(() => {
        toast.add({
            title: t("redact.toast.loadErrorTitle"),
            description: t("redact.toast.loadErrorDescription"),
            color: "error"
        });
    });
});

function onAddType(name: string, description: string) {
    addCustomType(name, description);
}

function onRemoveType(name: string) {
    removeCustomType(name);
}

function redact() {
    if (!hasInput.value || isRedacting.value) {
        return;
    }
    if (reviewDirty.value) {
        rerunConfirmOpen.value = true;
        return;
    }
    runRedact();
}

function runRedact() {
    applyRedact(inputText.value).catch(() => {
        toast.add({
            title: t("redact.toast.errorTitle"),
            description: t("redact.toast.errorDescription"),
            color: "error"
        });
    });
}

function confirmRerun() {
    rerunConfirmOpen.value = false;
    runRedact();
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-1">
            <h1 class="text-xl font-bold text-(--ui-text-highlighted)">
                {{ t("redact.page.title") }}
            </h1>
            <p class="text-sm text-(--ui-text-muted)">
                {{ t("redact.page.description") }}
            </p>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
            <aside class="lg:col-span-1">
                <UCard :ui="{ body: 'sm:p-5 p-4' }">
                    <RedactOptions
                        v-model:preset="preset"
                        v-model:types="types"
                        v-model:threshold="threshold"
                        v-model:blacklist="blacklist"
                        :is-dirty="isDirty"
                        :is-loading="isLoadingTypes"
                        @add-type="onAddType"
                        @remove-type="onRemoveType"
                    />
                </UCard>
            </aside>

            <div class="flex flex-col gap-6 lg:col-span-2">
                <UCard :ui="{ body: 'sm:p-5 p-4 flex flex-col gap-4' }">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5 text-sm font-semibold text-(--ui-text-highlighted)">
                            <UIcon name="i-lucide-text" class="size-4" />
                            {{ t("redact.input.title") }}
                        </div>
                        <span
                            v-if="hasInput"
                            class="text-xs tabular-nums text-(--ui-text-muted)"
                        >
                            {{ t("redact.input.stats", {
                                words: wordCount,
                                chars: inputText.length
                            }) }}
                        </span>
                    </div>

                    <UTextarea
                        v-model="inputText"
                        :rows="8"
                        autoresize
                        :placeholder="t('redact.input.placeholder')"
                        class="w-full"
                    />

                    <div class="flex items-center justify-between gap-2">
                        <UButton
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-eraser"
                            :disabled="!hasInput"
                            @click="inputText = ''"
                        >
                            {{ t("redact.input.clear") }}
                        </UButton>

                        <UButton
                            icon="i-lucide-wand-sparkles"
                            size="lg"
                            :loading="isRedacting"
                            :disabled="!hasInput"
                            @click="redact"
                        >
                            {{ t("redact.button") }}
                        </UButton>
                    </div>
                </UCard>

                <RedactEditor
                    v-model:review-dirty="reviewDirty"
                    :original-text="inputText"
                    :entities="entities"
                    :available-types="availableTypes"
                />

                <UModal v-model:open="rerunConfirmOpen" :title="t('redact.editor.rerunTitle')">
                    <template #body>
                        {{ t("redact.editor.rerunDescription") }}
                    </template>
                    <template #footer>
                        <UButton variant="ghost" @click="rerunConfirmOpen = false">
                            {{ t("redact.editor.cancel") }}
                        </UButton>
                        <UButton color="primary" @click="confirmRerun">
                            {{ t("redact.editor.rerun") }}
                        </UButton>
                    </template>
                </UModal>
            </div>
        </div>
    </div>
</template>
