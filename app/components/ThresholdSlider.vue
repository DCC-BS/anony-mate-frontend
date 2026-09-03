<script lang="ts" setup>
const props = withDefaults(
    defineProps<{
        /** Lowest value worth offering; below it there is nothing to show. */
        min?: number;
    }>(),
    { min: DETECTION_THRESHOLD }
);

const threshold = defineModel<number>({ required: true });

const { t } = useI18n();

const percent = computed(() => Math.round(threshold.value * 100));
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between">
            <span class="text-sm font-semibold text-highlighted">
                {{ t("threshold.title") }}
            </span>
            <span class="text-xs tabular-nums text-muted">{{ percent }}%</span>
        </div>

        <USlider
            v-model="threshold"
            :min="props.min"
            :max="1"
            :step="0.05"
            size="sm"
        />

        <p class="text-xs text-muted">{{ t("threshold.hint") }}</p>
    </div>
</template>
