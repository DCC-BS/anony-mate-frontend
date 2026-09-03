<script lang="ts" setup>
const props = withDefaults(
    defineProps<{
    documentId: string;
    /** Detection group the document currently carries, if it records one. */
    groupId?: string;
    /** True while this document is queued or being detected. */
    busy?: boolean;
    /** Matched to whatever it stands beside. */
    size?: "xs" | "sm";
    }>(),
    { size: "sm" }
);

const { t } = useI18n();
const { groups, payloadFor } = useEntityGroups();
const { recompute } = useDocumentQueue();

const open = ref(false);
/** The group picked, while the reader is being asked to confirm it. */
const pendingId = ref<string>();

const pending = computed(() =>
    groups.value.find((group) => group.id === pendingId.value)
);

// Nothing half-chosen survives the popover closing.
watch(open, (isOpen) => {
    if (!isOpen) {
        pendingId.value = undefined;
    }
});

/** Detects the document again, replacing everything it currently holds. */
async function confirm(): Promise<void> {
    const group = pending.value;
    if (!group) {
        return;
    }

    open.value = false;
    await recompute(
        props.documentId,
        { id: group.id, name: group.name },
        payloadFor(group.id)
    );
}
</script>

<template>
    <!-- The click stops here: in the document list this button sits inside the
         row's link to the review, and opening the group picker must not follow
         it. The popover's own handler is on this same button, so it still
         fires. -->
    <UPopover v-model:open="open">
        <UButton
            :size="props.size"
            variant="ghost"
            color="neutral"
            :icon="props.busy ? undefined : 'i-lucide-refresh-cw'"
            :loading="props.busy"
            :disabled="props.busy"
            :aria-label="t('recompute.action')"
            :title="t('recompute.action')"
            @click.prevent.stop
        />

        <template #content>
            <!-- Picking the group and confirming are two steps on purpose: the
                 run throws away every decision made on this document, which is
                 not something a single click should be able to do. -->
            <div v-if="!pending" class="flex w-72 flex-col gap-1 p-2">
                <span class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {{ t("recompute.chooseGroup") }}
                </span>

                <UButton
                    v-for="group in groups"
                    :key="group.id"
                    block
                    variant="ghost"
                    color="neutral"
                    class="justify-start"
                    :trailing-icon="group.id === props.groupId ? 'i-lucide-check' : undefined"
                    @click="pendingId = group.id"
                >
                    <span class="flex min-w-0 flex-col items-start">
                        <span class="truncate">{{ group.name }}</span>
                        <span class="text-xs text-muted">
                            {{ t("new.group.entityCount", { count: group.labels.length }) }}
                        </span>
                    </span>
                </UButton>
            </div>

            <div v-else class="flex w-72 flex-col gap-3 p-3">
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-semibold text-highlighted">
                        {{ t("recompute.confirmTitle", { group: pending.name }) }}
                    </span>
                    <p class="text-xs text-muted">
                        {{ t("recompute.confirmHint") }}
                    </p>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        @click="pendingId = undefined"
                    >
                        {{ t("recompute.back") }}
                    </UButton>
                    <UButton size="xs" color="warning" @click="confirm">
                        {{ t("recompute.start") }}
                    </UButton>
                </div>
            </div>
        </template>
    </UPopover>
</template>
