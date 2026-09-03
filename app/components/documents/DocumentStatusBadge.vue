<script lang="ts" setup>
import type { StoredDocument } from "~/types/storedDocument";

const props = defineProps<{
    document: StoredDocument;
    /** Place in the API queue, when the work is waiting on a busy service. */
    queuePosition?: number | null;
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

/**
 * A queued document says how many are ahead of it, so a long wait reads as a
 * queue rather than as a stall.
 */
const label = computed(() =>
    isBusy.value && props.queuePosition
        ? t("documents.status.queued", { position: props.queuePosition })
        : t(`documents.status.${status.value}`)
);
</script>

<template>
    <UBadge
        variant="subtle"
        size="sm"
        :color="presentation.color"
        :icon="presentation.icon"
        :ui="{ leadingIcon: isBusy ? 'animate-pulse' : undefined }"
    >
        {{ label }}
    </UBadge>
</template>
