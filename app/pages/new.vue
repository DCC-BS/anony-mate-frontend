<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const router = useRouter();

const { groups, blacklist, payloadFor } = useEntityGroups();
const { addDocument } = getDocumentService();
const { pump } = useDocumentQueue();

const selectedGroup = ref<string>();
const threshold = ref(0.5);

// Pick the first group as soon as the presets are seeded.
watch(
    groups,
    (available) => {
        if (!selectedGroup.value && available.length > 0) {
            selectedGroup.value = available[0]?.id;
        }
    },
    { immediate: true }
);

const tab = ref<"files" | "paste">("files");
const stagedFiles = ref<File[]>([]);
const uploadLabels = computed(() => ({
    label: t("new.dropTitle"),
    description: t("new.dropHint")
}));
const pastedText = ref("");

const tabItems = computed(() => [
    { label: t("new.tabs.files"), value: "files" as const },
    { label: t("new.tabs.paste"), value: "paste" as const }
]);

const canStart = computed(
    () =>
        Boolean(selectedGroup.value) &&
        (tab.value === "files"
            ? stagedFiles.value.length > 0
            : pastedText.value.trim().length > 0)
);

/**
 * Queues the staged files or the pasted text and returns to the overview,
 * where the queue reports progress.
 */
async function start() {
    const shared = {
        status: "staged" as const,
        entityTypes: payloadFor(selectedGroup.value as string),
        threshold: threshold.value,
        blacklist: blacklist.value
    };

    if (tab.value === "files") {
        for (const file of stagedFiles.value) {
            await addDocument({ ...shared, name: file.name, text: "", file });
        }
        stagedFiles.value = [];
    } else {
        await addDocument({
            ...shared,
            name: t("new.pastedName", { date: new Date().toLocaleString() }),
            text: pastedText.value
        });
        pastedText.value = "";
    }

    void pump();
    await router.push(localePath("/documents"));
}
</script>

<template>
    <div class="flex h-full flex-col gap-4 overflow-y-auto px-4 py-3">
        <div>
            <h1 class="text-xl font-bold text-(--ui-text-highlighted)">
                {{ t("new.title") }}
            </h1>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
            <UCard class="lg:col-span-2" :ui="{ body: 'flex flex-col gap-4' }">
                <UTabs v-model="tab" :items="tabItems" :content="false" />

                <template v-if="tab === 'files'">
                    <UFileUpload
                        v-model="stagedFiles"
                        multiple
                        layout="list"
                        position="outside"
                        size="sm"
                        :accept="UPLOAD_ACCEPT"
                        icon="i-lucide-file-up"
                        :label="uploadLabels.label"
                        :description="uploadLabels.description"
                        :ui="{
                            base: 'min-h-40 border-2 border-dashed border-default hover:border-primary transition-colors',
                            files: 'max-h-56 overflow-y-auto'
                        }"
                    />
                    <p v-if="stagedFiles.length" class="text-xs text-muted">
                        {{ t("new.staged", { count: stagedFiles.length }) }}
                    </p>
                </template>

                <template v-else>
                    <UTextarea
                        v-model="pastedText"
                        :rows="10"
                        autoresize
                        :placeholder="t('new.pastePlaceholder')"
                        class="w-full"
                    />
                    <div class="text-xs text-muted">
                        {{ t("new.pasteHint", { chars: pastedText.length }) }}
                    </div>
                </template>
            </UCard>

            <div class="flex flex-col gap-4">
                <UCard :ui="{ body: 'sm:p-5 p-4 flex flex-col gap-4' }">
                    <NewGroupSelect v-model="selectedGroup" :groups="groups" />

                    <NewThresholdSlider v-model="threshold" />
                </UCard>

                <UButton
                    block
                    size="lg"
                    icon="i-lucide-wand-sparkles"
                    :disabled="!canStart"
                    @click="start"
                >
                    {{ t("new.start") }}
                </UButton>
            </div>
        </div>
    </div>
</template>
