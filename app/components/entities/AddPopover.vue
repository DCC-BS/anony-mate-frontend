<script lang="ts" setup>
export interface AddField {
    key: string;
    label: string;
    placeholder?: string;
    /** Small helper line under the field. */
    hint?: string;
    /** Prefilled value; also the fallback when the field is left empty. */
    default?: string;
}

const props = defineProps<{ title: string; fields: AddField[] }>();
const emit = defineEmits<{ submit: [values: Record<string, string>] }>();

const { t } = useI18n();

const open = ref(false);
const values = ref<Record<string, string>>({});

/** Resets the form to the field defaults whenever the popover opens. */
watch(open, (isOpen) => {
    if (isOpen) {
        values.value = Object.fromEntries(
            props.fields.map((field) => [field.key, field.default ?? ""])
        );
    }
});

const firstField = computed(() => props.fields[0]?.key ?? "");
const canSubmit = computed(() => Boolean(values.value[firstField.value]?.trim()));

function submit() {
    if (!canSubmit.value) {
        return;
    }

    emit(
        "submit",
        Object.fromEntries(
            props.fields.map((field) => [
                field.key,
                values.value[field.key]?.trim() || field.default || ""
            ])
        )
    );
    open.value = false;
}
</script>

<template>
    <UPopover v-model:open="open">
        <UButton icon="i-lucide-plus" size="sm" variant="soft" :title="props.title" />

        <template #content>
            <form class="w-80 divide-y divide-default" @submit.prevent="submit">
                <div class="px-4 py-3 text-sm font-semibold text-highlighted">
                    {{ props.title }}
                </div>

                <div class="flex flex-col gap-3 px-4 py-3">
                    <UFormField
                        v-for="(field, index) in props.fields"
                        :key="field.key"
                        :label="field.label"
                        :help="field.hint"
                        size="sm"
                    >
                        <UInput
                            v-model="values[field.key]"
                            class="w-full"
                            :autofocus="index === 0"
                            :placeholder="field.placeholder"
                        />
                    </UFormField>
                </div>

                <div class="flex justify-end gap-2 px-4 py-2.5">
                    <UButton size="sm" variant="ghost" color="neutral" @click="open = false">
                        {{ t("entities.cancel") }}
                    </UButton>
                    <UButton type="submit" size="sm" :disabled="!canSubmit">
                        {{ t("entities.newType.add") }}
                    </UButton>
                </div>
            </form>
        </template>
    </UPopover>
</template>
