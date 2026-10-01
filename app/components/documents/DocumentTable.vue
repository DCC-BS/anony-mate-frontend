<script lang="ts" setup>
import type { StoredDocument } from "~/types/storedDocument";

const props = defineProps<{
    documents: StoredDocument[];
    queuePositions: Record<string, number | null>;
}>();
const emit = defineEmits<{ retry: [id: string]; remove: [id: string] }>();

const { t, locale } = useI18n();
const localePath = useLocalePath();
const { documentGroupName } = useGroupName();
const NuxtLink = resolveComponent("NuxtLink");

// Status is shown at every width, so the narrow layout needs a column for it
// too: with only name and actions, the header's status label would sit over
// the buttons. The detection group and the count stay hidden below `lg`.
const rowGrid =
    "grid grid-cols-[minmax(0,1fr)_auto_124px] items-center gap-3 lg:grid-cols-[minmax(0,1fr)_150px_minmax(0,150px)_90px_124px]";

/** Documents still on their way through the API cannot be sent again. */
function isBusy(document: StoredDocument): boolean {
    return (
        document.status === "staged" ||
        document.status === "converting" ||
        document.status === "redacting"
    );
}

function formatDate(date: Date): string {
    return date.toLocaleString(locale.value);
}

/**
 * A marked PDF has no review here: it is downloaded and opened in an editor
 * such as Kofax, so its row leads nowhere and offers the file instead.
 */
function isMarked(document: StoredDocument): boolean {
    return Boolean(document.markedPdf);
}

function downloadMarked(document: StoredDocument): void {
    if (document.markedFile) {
        downloadBlob(document.markedFile, markedPdfName(document.name));
    }
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
            class="border-b border-default bg-muted px-5 py-2.5 text-meta font-medium uppercase tracking-wider text-dimmed"
            :class="rowGrid"
        >
            <div>{{ t("documents.table.document") }}</div>
            <div>{{ t("documents.table.status") }}</div>
            <div class="hidden lg:block">{{ t("documents.table.group") }}</div>
            <div class="hidden lg:block">{{ t("documents.table.detections") }}</div>
            <div />
        </div>

        <component
            :is="isMarked(document) ? 'div' : NuxtLink"
            v-for="document in props.documents"
            :key="document.id"
            :to="isMarked(document) ? undefined : localePath(`/documents/${document.id}`)"
            class="border-b border-default px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted"
            :class="rowGrid"
        >
            <div class="flex min-w-0 items-center gap-3">
                <span
                    class="grid size-7.5 flex-none place-items-center rounded-lg bg-(--ui-primary-soft) text-(--ui-primary-strong)"
                >
                    <UIcon
                        :name="isMarked(document) ? 'i-lucide-file-check' : 'i-lucide-file-text'"
                        class="size-4"
                    />
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

            <div>
                <DocumentsDocumentStatusBadge
                    :document="document"
                    :queue-position="props.queuePositions[document.id] ?? null"
                />
            </div>

            <div
                class="hidden min-w-0 truncate text-muted lg:block"
                :title="documentGroupName(document.entityGroupName)"
            >
                {{ documentGroupName(document.entityGroupName) || "—" }}
            </div>

            <div class="hidden tabular-nums text-muted lg:block">
                {{ document.status === "ready" ? document.detectionCount : "—" }}
            </div>

            <div class="flex justify-end gap-1">
                <UButton
                    v-if="isMarked(document) && document.markedFile"
                    icon="i-lucide-download"
                    variant="ghost"
                    color="primary"
                    size="sm"
                    :title="t('documents.table.download')"
                    :aria-label="t('documents.table.download')"
                    @click.prevent.stop="downloadMarked(document)"
                />
                <RecomputeButton
                    v-if="!isMarked(document)"
                    :document-id="document.id"
                    :group-id="document.entityGroupId"
                    :busy="isBusy(document)"
                />
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
        </component>
    </UCard>
</template>
