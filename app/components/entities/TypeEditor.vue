<script lang="ts" setup>
import type { StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{ type: StoredEntityType }>();
const emit = defineEmits<{
    save: [type: StoredEntityType, patch: Partial<StoredEntityType>];
    remove: [type: StoredEntityType];
}>();

const { t } = useI18n();

const name = ref(props.type.name);
const displayName = ref(props.type.displayName);
const description = ref(props.type.description);
const replacement = ref(props.type.replacement);

/**
 * The API label is generated from the display name until the user edits it
 * manually — and only for types that still carry their placeholder name.
 * Both facts are editor state: the first generated value already hides the
 * placeholder, so a string check would stop after one keystroke.
 */
const labelTouched = ref(false);
const nameIsPlaceholder = ref(props.type.name.startsWith("new-type"));

watch(displayName, (value) => {
    if (!labelTouched.value && nameIsPlaceholder.value) {
        name.value = slugifyLabel(value) || props.type.name;
    }
});

const tokens = useReplacementTokens();

/** What a first mention of this type looks like in the redacted document. */
const example = computed(() =>
    replacementFor(
        { label: name.value, subjectIndex: 1, occurrenceIndex: 1 },
        replacement.value,
        displayName.value || undefined
    )
);

const title = computed(
    () => displayName.value || name.value || t("entities.newType.title")
);

/** Pushes every changed field to the store; runs on blur and on unmount. */
function flush() {
    const patch: Partial<StoredEntityType> = {};
    const trimmedName = name.value.trim();
    if (trimmedName && trimmedName !== props.type.name) {
        patch.name = trimmedName;
    }
    if (displayName.value.trim() !== props.type.displayName) {
        patch.displayName = displayName.value.trim();
    }
    if (description.value.trim() !== props.type.description) {
        patch.description = description.value.trim();
    }
    const nextReplacement = replacement.value.trim() || DEFAULT_REPLACEMENT;
    if (nextReplacement !== props.type.replacement) {
        patch.replacement = nextReplacement;
    }
    if (Object.keys(patch).length > 0) {
        emit("save", props.type, patch);
    }
}

onUnmounted(flush);
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
        <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-highlighted">{{ title }}</h2>
            <UBadge v-if="props.type.builtin" size="sm" variant="subtle" color="neutral">
                {{ t("entities.builtin") }}
            </UBadge>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
                :label="t('entities.editor.displayName')"
                :hint="t('entities.editor.displayNameHint')"
            >
                <UInput
                    v-model="displayName"
                    class="w-full"
                    :placeholder="t('entities.editor.displayNamePlaceholder')"
                    @blur="flush"
                />
            </UFormField>
            <UFormField
                :label="t('entities.editor.label')"
                :hint="t('entities.editor.labelHint')"
            >
                <UInput
                    v-model="name"
                    class="w-full font-mono"
                    :placeholder="t('entities.editor.labelPlaceholder')"
                    @input="labelTouched = true; nameIsPlaceholder = false"
                    @blur="flush"
                />
            </UFormField>
        </div>

        <UFormField
            :label="t('entities.editor.description')"
            :hint="t('entities.editor.descriptionHint')"
        >
            <UTextarea
                v-model="description"
                :rows="4"
                class="w-full"
                :placeholder="t('entities.editor.descriptionPlaceholder')"
                @blur="flush"
            />
        </UFormField>

        <UFormField :label="t('entities.editor.replacement')">
            <UInput
                v-model="replacement"
                class="w-full font-mono"
                @blur="flush"
            />
            <template #hint>
                <span>
                    {{ t("entities.replacement.hint") }}
                    <span
                        v-for="entry in tokens"
                        :key="entry.token"
                        class="mr-1.5 font-mono"
                    >{{ entry.placeholder }}</span>
                    —
                    {{ t("entities.editor.example", { example }) }}
                </span>
            </template>
        </UFormField>

        <div class="mt-auto flex items-center justify-between pt-2">
            <UButton
                v-if="!props.type.builtin"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="emit('remove', props.type)"
            >
                {{ t("entities.deleteType") }}
            </UButton>
            <span v-else />
            <span class="text-meta text-dimmed">
                {{ t("entities.editor.autoSave") }}
            </span>
        </div>
    </div>
</template>
