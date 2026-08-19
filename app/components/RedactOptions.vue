<script setup lang="ts">
import type { EntityTypeItem } from "~~/app/composables/useRedact";
import type { EntityTypePreset } from "~~/shared/types/redactTypes";

const { t } = useI18n();

const props = defineProps<{
    isDirty: boolean;
    isLoading: boolean;
}>();

const preset = defineModel<EntityTypePreset>("preset", { default: "default" });
const types = defineModel<EntityTypeItem[]>("types", { required: true });
const threshold = defineModel<number>("threshold", { default: 0.5 });
const blacklist = defineModel<string[]>("blacklist", { default: () => [] as string[] });

const emit = defineEmits<{
    "add-type": [name: string, description: string];
    "remove-type": [name: string];
}>();

const presetItems = [
    { label: t("redact.preset.default"), value: "default" },
    { label: t("redact.preset.legal"), value: "legal" }
];

const DOT_CLASSES: Record<string, string> = {
    primary: "bg-(--ui-primary)",
    secondary: "bg-(--ui-secondary)",
    success: "bg-(--ui-success)",
    info: "bg-(--ui-info)",
    warning: "bg-(--ui-warning)",
    error: "bg-(--ui-error)"
};

function dotClass(name: string): string {
    return DOT_CLASSES[entityColor(name)] ?? "bg-(--ui-primary)";
}

const enabledCount = computed(
    () => types.value.filter((type) => type.enabled).length
);

const confirmOpen = ref(false);
const pendingPreset = ref<EntityTypePreset | null>(null);
const showAddForm = ref(false);
const newName = ref("");
const newDescription = ref("");
const nameError = ref<string | undefined>();

const selectedPreset = computed<EntityTypePreset | undefined>({
    get: () => preset.value,
    set: (value) => onPresetChange(value ?? null)
});

function onPresetChange(value: EntityTypePreset | null) {
    if (!value || value === preset.value) {
        return;
    }

    pendingPreset.value = value;
    if (props.isDirty) {
        confirmOpen.value = true;
    } else {
        commitPreset();
    }
}

function commitPreset() {
    if (pendingPreset.value) {
        preset.value = pendingPreset.value;
    }
    pendingPreset.value = null;
    confirmOpen.value = false;
}

function cancelPreset() {
    pendingPreset.value = null;
    confirmOpen.value = false;
}

function submitNewType() {
    const name = newName.value.trim();
    const description = newDescription.value.trim();

    if (!name) {
        nameError.value = t("redact.errors.nameRequired");
        return;
    }

    const duplicate = types.value.some(
        (type) => type.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
        nameError.value = t("redact.errors.nameDuplicate");
        return;
    }

    emit("add-type", name, description);
    newName.value = "";
    newDescription.value = "";
    nameError.value = undefined;
    showAddForm.value = false;
}

const thresholdPercent = computed(() => Math.round(threshold.value * 100));

const thresholdHint = computed(() =>
    threshold.value >= 0.8
        ? t("redact.options.thresholdStrict")
        : threshold.value <= 0.3
            ? t("redact.options.thresholdLoose")
            : t("redact.options.thresholdBalanced")
);
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-1.5 text-sm font-semibold text-(--ui-text-highlighted)">
                <UIcon name="i-lucide-layers" class="size-4" />
                {{ t("redact.options.presetSection") }}
            </div>
            <USelect
                v-model="selectedPreset"
                :items="presetItems"
                value-key="value"
                :loading="isLoading"
                class="w-full"
            />
        </div>

        <USeparator />

        <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 text-sm font-semibold text-(--ui-text-highlighted)">
                    <UIcon name="i-lucide-tags" class="size-4" />
                    {{ t("redact.options.entities") }}
                </div>
                <UBadge
                    v-if="types.length"
                    color="neutral"
                    variant="soft"
                    size="sm"
                >
                    {{ t("redact.options.activeCount", {
                        enabled: enabledCount,
                        total: types.length
                    }) }}
                </UBadge>
            </div>

            <div v-if="isLoading" class="flex flex-col gap-2">
                <USkeleton v-for="i in 3" :key="i" class="h-14 w-full" />
            </div>

            <div v-else class="flex flex-col gap-2">
                <div
                    v-for="type in types"
                    :key="type.name"
                    class="flex flex-col gap-2 rounded-md border px-3 py-2 transition-colors"
                    :class="type.enabled
                        ? 'border-(--ui-border-accented) bg-(--ui-bg-elevated)/50'
                        : 'border-(--ui-border)'"
                >
                    <div class="flex items-center gap-2">
                        <span
                            class="size-2.5 shrink-0 rounded-full transition-opacity"
                            :class="[dotClass(type.name), type.enabled ? 'opacity-100' : 'opacity-30']"
                        />
                        <UCheckbox v-model="type.enabled" :label="type.name" />

                        <UBadge v-if="type.custom" color="info" variant="soft" size="sm">
                            {{ t("redact.options.custom") }}
                        </UBadge>

                        <UButton
                            v-if="type.custom"
                            icon="i-lucide-trash-2"
                            color="error"
                            variant="ghost"
                            size="sm"
                            class="ml-auto"
                            :aria-label="t('redact.options.remove')"
                            @click="emit('remove-type', type.name)"
                        />
                    </div>

                    <UInput
                        v-if="type.enabled"
                        :model-value="type.description"
                        :placeholder="type.description"
                        size="sm"
                        :aria-label="`${type.name} ${t('redact.options.descriptionLabel')}`"
                        @update:model-value="type.description = $event"
                    />
                </div>

                <div
                    v-if="showAddForm"
                    class="flex flex-col gap-2 rounded-md border border-dashed border-(--ui-border-accented) bg-(--ui-bg-elevated)/50 p-3"
                >
                    <UFormField :error="nameError">
                        <div class="flex flex-col gap-2">
                            <UInput
                                v-model="newName"
                                :placeholder="t('redact.options.typeName')"
                                icon="i-lucide-tag"
                            />
                            <UInput
                                v-model="newDescription"
                                :placeholder="t('redact.options.typeDescription')"
                                icon="i-lucide-text"
                                @keydown.enter="submitNewType"
                            />
                            <div class="flex justify-end gap-2">
                                <UButton variant="ghost" @click="showAddForm = false">
                                    {{ t("redact.options.cancel") }}
                                </UButton>
                                <UButton icon="i-lucide-plus" @click="submitNewType">
                                    {{ t("redact.options.add") }}
                                </UButton>
                            </div>
                        </div>
                    </UFormField>
                </div>

                <UButton
                    v-else
                    icon="i-lucide-plus"
                    variant="outline"
                    dashed
                    block
                    @click="showAddForm = true"
                >
                    {{ t("redact.options.addType") }}
                </UButton>
            </div>
        </div>

        <USeparator />

        <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 text-sm font-semibold text-(--ui-text-highlighted)">
                    <UIcon name="i-lucide-sliders-horizontal" class="size-4" />
                    {{ t("redact.options.threshold") }}
                </div>
                <UBadge color="neutral" variant="soft" size="sm" class="tabular-nums">
                    {{ thresholdPercent }}%
                </UBadge>
            </div>
            <USlider
                v-model="threshold"
                :min="0"
                :max="1"
                :step="0.05"
                class="w-full"
            />
            <p class="text-xs text-(--ui-text-muted)">
                {{ thresholdHint }}
            </p>
        </div>

        <USeparator />

        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-1.5 text-sm font-semibold text-(--ui-text-highlighted)">
                <UIcon name="i-lucide-shield-check" class="size-4" />
                {{ t("redact.options.blacklist") }}
            </div>
            <p class="text-xs text-(--ui-text-muted)">
                {{ t("redact.options.blacklistHint") }}
            </p>
            <UInputTags
                v-model="blacklist"
                :placeholder="t('redact.options.blacklistPlaceholder')"
            />
        </div>

        <UModal v-model:open="confirmOpen" :title="t('redact.confirm.title')">
            <template #body>
                {{ t("redact.confirm.description") }}
            </template>
            <template #footer>
                <UButton variant="ghost" @click="cancelPreset">
                    {{ t("redact.options.cancel") }}
                </UButton>
                <UButton color="primary" @click="commitPreset">
                    {{ t("redact.confirm.confirm") }}
                </UButton>
            </template>
        </UModal>
    </div>
</template>
