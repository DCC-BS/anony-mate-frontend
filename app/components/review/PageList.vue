<script lang="ts" setup>
const props = defineProps<{
    /** Detections per page, in page order. */
    counts: number[];
    activePage: number;
}>();
const emit = defineEmits<{ select: [page: number] }>();

const { t } = useI18n();
</script>

<template>
    <div class="flex h-full min-h-0 flex-col gap-2">
        <div class="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-dimmed">
            {{ t("review.pages") }}
        </div>

        <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
            <button
                v-for="(count, index) in props.counts"
                :key="index"
                type="button"
                :class="[
                    'flex w-full items-center justify-between rounded-(--ui-radius) border px-2.5 py-1.5 text-xs transition-colors',
                    index + 1 === props.activePage
                        ? 'border-primary bg-elevated'
                        : 'border-accented hover:bg-muted'
                ]"
                @click="emit('select', index + 1)"
            >
                <span>{{ t("review.page", { page: index + 1 }) }}</span>
                <UBadge v-if="count" size="sm" variant="subtle" color="neutral">
                    {{ count }}
                </UBadge>
            </button>
        </div>
    </div>
</template>
