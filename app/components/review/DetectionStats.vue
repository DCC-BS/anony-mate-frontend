<script lang="ts" setup>
const props = defineProps<{
    counts: { total: number; redacted: number; unredacted: number };
}>();

const { t } = useI18n();

// No progress bar underneath: everything starts redacted, so a bar of that
// share would start full and only ever fall, which reads as losing ground
// rather than as reviewing. The two counters say it without the theatre.
const stats = computed(() => [
    {
        key: "redacted",
        value: props.counts.redacted,
        color: "text-(--ui-primary)"
    },
    {
        key: "unredacted",
        value: props.counts.unredacted,
        color: "text-(--ui-text-muted)"
    }
]);
</script>

<template>
    <div class="grid grid-cols-2 gap-2">
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
</template>
