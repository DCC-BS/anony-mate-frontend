<script lang="ts" setup>
const props = defineProps<{
    counts: { total: number; open: number; accepted: number; rejected: number };
}>();

const { t } = useI18n();

/** Share of decided detections, for the bar under the counters. */
const decidedPercent = computed(() =>
    props.counts.total === 0
        ? 0
        : Math.round(
              ((props.counts.accepted + props.counts.rejected) /
                  props.counts.total) *
                  100
          )
);

const stats = computed(() => [
    { key: "open", value: props.counts.open, color: "text-(--ui-warning)" },
    { key: "accepted", value: props.counts.accepted, color: "text-(--ui-success)" },
    { key: "rejected", value: props.counts.rejected, color: "text-(--ui-text-muted)" }
]);
</script>

<template>
    <div class="flex flex-col gap-3">
        <div class="grid grid-cols-3 gap-2">
            <div
                v-for="stat in stats"
                :key="stat.key"
                class="rounded-md border border-accented p-2 text-center"
            >
                <div :class="['text-lg font-semibold tabular-nums', stat.color]">
                    {{ stat.value }}
                </div>
                <div class="text-xs text-(--ui-text-muted)">
                    {{ t(`review.stats.${stat.key}`) }}
                </div>
            </div>
        </div>

        <UProgress :model-value="decidedPercent" color="success" size="sm" />
    </div>
</template>
