<script lang="ts" setup>
const props = defineProps<{
    /** Detections per page, in page order. */
    counts: number[];
    activePage: number;
}>();
const emit = defineEmits<{ select: [page: number] }>();

/** Whether the rail is folded down to its strip. */
const collapsed = defineModel<boolean>("collapsed", { default: false });

const { t } = useI18n();
</script>

<template>
    <!-- Open, the rail lists every page with its detections; folded, it hands
         its width to the document and keeps only the way back. -->
    <div class="flex h-full min-h-0 flex-col gap-2">
        <template v-if="!collapsed">
            <div class="flex items-center justify-between gap-1">
                <div class="text-eyebrow font-semibold uppercase tracking-eyebrow text-dimmed">
                    {{ t("review.pages") }}
                </div>

                <UButton
                    icon="i-lucide-panel-left-close"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :title="t('review.collapsePages')"
                    :aria-label="t('review.collapsePages')"
                    @click="collapsed = true"
                />
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
        </template>

        <template v-else>
            <!-- Folded to a strip: one button wide, nothing else, so the
                 document takes nearly all the width the rail had. -->
            <UButton
                icon="i-lucide-panel-left-open"
                variant="ghost"
                color="neutral"
                size="xs"
                class="mx-auto"
                :title="t('review.expandPages')"
                :aria-label="t('review.expandPages')"
                @click="collapsed = false"
            />
        </template>
    </div>
</template>