<script lang="ts" setup>
import type { StoredDocument } from "~/types/storedDocument";

const props = defineProps<{ document: StoredDocument; openCount?: number }>();

const { t } = useI18n();

/**
 * A ready document whose detections have all been decided is shown as
 * reviewed, so the list distinguishes "still to do" from "done".
 */
const status = computed(() =>
    props.document.status === "ready" && props.openCount === 0
        ? "reviewed"
        : props.document.status
);

const presentation = computed(
    () =>
        ({
            staged: { color: "neutral" as const, icon: "i-lucide-clock" },
            converting: { color: "info" as const, icon: "i-lucide-file-cog" },
            redacting: { color: "info" as const, icon: "i-lucide-scan-text" },
            ready: { color: "warning" as const, icon: "i-lucide-eye" },
            reviewed: { color: "success" as const, icon: "i-lucide-check" },
            failed: { color: "error" as const, icon: "i-lucide-circle-alert" }
        })[status.value]
);

const isBusy = computed(
    () => status.value === "converting" || status.value === "redacting"
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
        {{ t(`documents.status.${status}`) }}
    </UBadge>
</template>
