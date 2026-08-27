<script lang="ts" setup>
const threshold = defineModel<number>({ required: true });

const { t } = useI18n();

const percent = computed(() => Math.round(threshold.value * 100));
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between">
            <span class="text-sm font-semibold text-highlighted">
                {{ t("new.threshold.title") }}
            </span>
            <span class="text-xs tabular-nums text-muted">{{ percent }}%</span>
        </div>

        <USlider v-model="threshold" :min="0.1" :max="1" :step="0.05" size="sm" />

        <p class="text-xs text-muted">{{ t("new.threshold.hint") }}</p>
    </div>
</template>
