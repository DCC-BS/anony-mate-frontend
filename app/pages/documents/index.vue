<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const {
    documents,
    queuePositions,
    pending,
    progress,
    isProcessing,
    retry,
} =
    useDocumentQueue();
const { deleteDocument } = getDocumentService();

const query = ref("");

const visibleDocuments = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return needle
        ? documents.value.filter((document) =>
              document.name.toLowerCase().includes(needle)
          )
        : documents.value;
});

const hasDocuments = computed(() => documents.value.length > 0);
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h1 class="text-xl font-bold text-(--ui-text-highlighted)">
                    {{ t("documents.title") }}
                </h1>
            </div>

            <UButton icon="i-lucide-plus" :to="localePath('/new')">
                {{ t("documents.new") }}
            </UButton>
        </div>

        <UCard v-if="isProcessing && pending.length > 1" :ui="{ body: 'flex flex-col gap-2' }">
            <div class="flex items-center justify-between text-sm">
                <span class="text-(--ui-text-muted)">
                    {{ t("documents.processing", { count: pending.length }) }}
                </span>
                <span class="tabular-nums text-(--ui-text-muted)">{{ progress }}%</span>
            </div>
            <UProgress :model-value="progress" />
        </UCard>

        <UInput
            v-if="hasDocuments"
            v-model="query"
            icon="i-lucide-search"
            size="sm"
            :placeholder="t('documents.search')"
        />

        <div v-if="hasDocuments" class="flex min-h-0 flex-1 flex-col">
            <DocumentsDocumentTable
                :documents="visibleDocuments"
                :queue-positions="queuePositions"
                @retry="retry"
                @remove="deleteDocument"
            />

            <p
                v-if="!visibleDocuments.length"
                class="p-6 text-center text-xs text-dimmed"
            >
                {{ t("documents.noMatches") }}
            </p>
        </div>

        <UCard v-else :ui="{ body: 'p-10 text-center flex flex-col items-center gap-3' }">
            <UIcon name="i-lucide-inbox" class="size-8 text-(--ui-text-dimmed)" />
            <p class="text-sm text-(--ui-text-muted)">{{ t("documents.empty") }}</p>
            <UButton variant="soft" :to="localePath('/new')">
                {{ t("documents.new") }}
            </UButton>
        </UCard>
    </div>
</template>
