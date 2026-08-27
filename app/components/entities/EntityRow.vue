<script lang="ts" setup>
import type { StoredEntityType } from "~/types/storedEntity";

const props = defineProps<{ type: StoredEntityType }>();
const emit = defineEmits<{
    save: [type: StoredEntityType];
    rename: [oldName: string, newName: string];
    remove: [name: string];
}>();

const { t } = useI18n();
const { getEntityColor } = useEntityColor();

const editing = ref(false);
const draftName = ref(props.type.name);
const draftDescription = ref(props.type.description);
const draftReplacement = ref(props.type.replacement);

const replacementTokens = useReplacementTokens();

/** What a first mention of this type looks like in the redacted document. */
const example = computed(() =>
    replacementFor(
        { label: props.type.name, subjectIndex: 1, occurrenceIndex: 1 },
        props.type.replacement
    )
);

function startEdit() {
    draftName.value = props.type.name;
    draftDescription.value = props.type.description;
    draftReplacement.value = props.type.replacement;
    editing.value = true;
}

function save() {
    const name = draftName.value.trim();
    if (!name) {
        return;
    }

    emit("save", {
        ...props.type,
        description: draftDescription.value.trim(),
        replacement: draftReplacement.value.trim() || DEFAULT_REPLACEMENT
    });
    if (name !== props.type.name) {
        emit("rename", props.type.name, name);
    }
    editing.value = false;
}
</script>

<template>
    <div class="flex items-start gap-2.5 border-b border-default px-3 py-2 last:border-b-0">
        <span
            class="mt-1.5 size-2 flex-none rounded-full"
            :style="{ background: getEntityColor(props.type.name).solid }"
        />

        <form v-if="editing" class="flex min-w-0 flex-1 flex-col gap-1.5" @submit.prevent="save">
            <UInput v-model="draftName" size="xs" :placeholder="t('entities.newType.name')" />
            <UInput
                v-model="draftDescription"
                size="xs"
                :placeholder="t('entities.newType.descriptionPlaceholder')"
            />
            <UInput
                v-model="draftReplacement"
                size="xs"
                :placeholder="DEFAULT_REPLACEMENT"
                :ui="{ base: 'font-mono' }"
            />
            <dl class="flex flex-col gap-0.5 text-[0.7rem] text-dimmed">
                <div
                    v-for="entry in replacementTokens"
                    :key="entry.token"
                    class="flex gap-1.5"
                >
                    <dt class="font-mono text-muted">{{ entry.placeholder }}</dt>
                    <dd>{{ entry.description }}</dd>
                </div>
            </dl>
            <div class="flex gap-1">
                <UButton type="submit" size="xs" variant="soft">
                    {{ t("entities.save") }}
                </UButton>
                <UButton size="xs" variant="ghost" color="neutral" @click="editing = false">
                    {{ t("entities.cancel") }}
                </UButton>
            </div>
        </form>

        <template v-else>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                    <span class="truncate font-mono text-[0.8rem] text-highlighted">
                        {{ props.type.name }}
                    </span>
                    <UBadge v-if="props.type.builtin" size="sm" variant="subtle" color="neutral">
                        {{ t("entities.builtin") }}
                    </UBadge>
                    <span class="truncate font-mono text-[0.7rem] text-dimmed">
                        → {{ example }}
                    </span>
                </div>
                <p class="truncate text-xs text-muted">
                    {{ props.type.description || t("entities.noDescription") }}
                </p>
            </div>

            <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                :title="t('entities.edit')"
                @click="startEdit"
            />
            <UButton
                v-if="!props.type.builtin"
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                :title="t('entities.deleteType')"
                @click="emit('remove', props.type.name)"
            />
        </template>
    </div>
</template>
