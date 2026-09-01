<script lang="ts" setup>
import type { StoredDocument } from "~/types/storedDocument";

const props = defineProps<{
    documents: StoredDocument[];
    openCounts: Record<string, number>;
}>();
const emit = defineEmits<{ retry: [id: string]; remove: [id: string] }>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const rowGrid =
    "grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_150px_130px_92px]";

function formatDate(date: Date): string {
    return date.toLocaleString(locale.value);
}
</script>

<template>
    <!-- Scrolls inside the card, so the border stays a closed box around the
         rows instead of running off the end of a long list. -->
    <UCard
        class="flex min-h-0 flex-col overflow-hidden ring ring-default"
        :ui="{ body: 'min-h-0 flex-1 p-0 sm:p-0 overflow-y-auto' }"
    >
        <div
            class="border-b border-default bg-muted px-5 py-2.5 text-[0.72rem] font-medium uppercase tracking-wider text-dimmed"
            :class="rowGrid"
        >
            <div>{{ t("documents.table.document") }}</div>
            <div>{{ t("documents.table.status") }}</div>
            <div class="hidden sm:block">{{ t("documents.table.detections") }}</div>
            <div />
        </div>

        <NuxtLink
            v-for="document in props.documents"
            :key="document.id"
            :to="localePath(`/documents/${document.id}`)"
            class="border-b border-default px-5 py-3 text-[0.88rem] transition-colors last:border-b-0 hover:bg-muted"
            :class="rowGrid"
        >
            <div class="flex min-w-0 items-center gap-3">
                <span
                    class="grid size-7.5 flex-none place-items-center rounded-lg bg-(--ui-primary-soft) text-(--ui-primary-strong)"
                >
                    <UIcon name="i-lucide-file-text" class="size-4" />
                </span>
                <span class="min-w-0">
                    <span class="block truncate font-medium" :title="document.name">
                        {{ document.name }}
                    </span>
                    <span class="block truncate text-xs text-muted">
                        {{ formatDate(document.createdAt) }}
                        <template v-if="document.errorMessage">
                            · {{ document.errorMessage }}
                        </template>
                    </span>
                </span>
            </div>

            <div class="hidden sm:block">
                <DocumentsDocumentStatusBadge
                    :document="document"
                    :open-count="props.openCounts[document.id] ?? 0"
                />
            </div>

            <div class="hidden tabular-nums text-muted sm:block">
                {{ document.status === "ready" ? document.detectionCount : "—" }}
            </div>

            <div class="flex justify-end gap-1">
                <UButton
                    v-if="document.status === 'failed'"
                    icon="i-lucide-rotate-ccw"
                    variant="ghost"
                    color="warning"
                    size="sm"
                    :title="t('documents.table.retry')"
                    @click.prevent.stop="emit('retry', document.id)"
                />
                <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="sm"
                    :title="t('documents.table.remove')"
                    @click.prevent.stop="emit('remove', document.id)"
                />
            </div>
        </NuxtLink>
    </UCard>
</template>
