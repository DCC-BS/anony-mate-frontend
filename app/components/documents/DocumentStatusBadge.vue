<script lang="ts" setup>
import type { StoredDocument } from "~/types/storedDocument";

const props = defineProps<{
    document: StoredDocument;
    /** Place in the API queue, when the work is waiting on a busy service. */
    queuePosition?: number | null;
    /** Share of the scan done, while the API's task reports one. */
    scanProgress?: number | null;
}>();

const { t } = useI18n();

/**
 * A document is redacted the moment its detections arrive — everything found
 * is taken out until a reader says otherwise — so a ready document is a done
 * one, and the review is where it is refined rather than completed.
 */
const status = computed(() => props.document.status);

const presentation = computed(
    () =>
        ({
            staged: { color: "neutral" as const, icon: "i-lucide-clock" },
            converting: { color: "info" as const, icon: "i-lucide-file-cog" },
            redacting: { color: "info" as const, icon: "i-lucide-scan-text" },
            ready: { color: "success" as const, icon: "i-lucide-check" },
            failed: { color: "error" as const, icon: "i-lucide-circle-alert" }
        })[status.value]
);

const isBusy = computed(
    () => status.value === "converting" || status.value === "redacting"
);

/** A PDF from before the review came here is done: it is refined in an editor such as Kofax. */
const isMarked = computed(
    () => status.value === "ready" && props.document.markedPdf
);

/**
 * A queued document says how many are ahead of it, so a long wait reads as a
 * queue rather than as a stall. A scan carries a fraction instead: it says how
 * far along the work is, in the badge the status otherwise would be.
 */
const label = computed(() => {
    if (isBusy.value && props.queuePosition) {
        return t("documents.status.queued", { position: props.queuePosition });
    }
    if (status.value === "redacting" && props.scanProgress != null) {
        return t("documents.status.redactingProgress", {
            percent: Math.round(props.scanProgress * 100)
        });
    }
    return isMarked.value
        ? t("documents.status.marked")
        : t(`documents.status.${status.value}`);
});
</script>

<template>
    <UBadge
        variant="subtle"
        size="sm"
        :color="presentation.color"
        :icon="isMarked ? 'i-lucide-file-check' : presentation.icon"
        :ui="{ leadingIcon: isBusy ? 'animate-pulse' : undefined }"
    >
        {{ label }}
    </UBadge>
</template>
