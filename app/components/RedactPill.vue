<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";

const { t } = useI18n();

const props = defineProps({
    ...nodeViewProps
});

const { editor, getPos, updateAttributes } = props;

const availableTypes = computed(() => editorAvailableTypes.value);

const originalText = computed(() => props.node.attrs.text as string);
const label = computed(() => props.node.attrs.label as string);
const confidence = computed(() => props.node.attrs.confidence as number);

const confidencePercent = computed(() => Math.round(confidence.value * 100));

function changeType(newLabel: string, close: () => void) {
    if (newLabel !== label.value) {
        updateAttributes({ label: newLabel });
    }
    close();
}

function removeRedaction(close: () => void) {
    const pos = getPos();
    if (pos !== undefined) {
        editor
            .chain()
            .insertContentAt({ from: pos, to: pos + 1 }, originalText.value, {
                updateSelection: false
            })
            .run();
    }
    close();
}
</script>

<template>
    <NodeViewWrapper as="span" class="inline">
        <UPopover :content="{ side: 'top', sideOffset: 8 }">
            <template #default>
                <UTooltip :delay="200">
                    <UButton
                        variant="solid"
                        :color="entityColor(label)"
                        size="xs"
                        class="mx-0.5 cursor-pointer rounded-sm font-semibold"
                    >
                        {{ label }}
                    </UButton>

                    <template #content>
                        <div class="max-w-64 space-y-1 p-2 text-sm">
                            <p class="font-medium">
                                {{ t("redact.editor.original") }}
                            </p>
                            <p class="text-(--neutral-500) break-words">
                                {{ originalText }}
                            </p>
                        </div>
                    </template>
                </UTooltip>
            </template>

            <template #content="{ close }">
                <div class="w-56 space-y-2 p-2">
                    <div class="flex items-center justify-between gap-2">
                        <UBadge :color="entityColor(label)" variant="soft">
                            {{ label }}
                        </UBadge>
                        <span class="text-xs tabular-nums text-(--neutral-500)">
                            {{ t("redact.editor.confidence") }}:
                            {{ confidencePercent }}%
                        </span>
                    </div>

                    <USeparator />

                    <p class="text-xs font-medium text-(--neutral-500)">
                        {{ t("redact.editor.original") }}
                    </p>
                    <p class="break-words text-sm text-(--neutral-500)">
                        {{ originalText }}
                    </p>

                    <USeparator />

                    <p class="text-xs font-medium text-(--neutral-500)">
                        {{ t("redact.editor.changeType") }}
                    </p>
                    <div class="flex flex-col gap-1">
                        <UButton
                            v-for="type in availableTypes"
                            :key="type"
                            :icon="type === label ? 'i-lucide-check' : undefined"
                            variant="ghost"
                            size="sm"
                            class="justify-start"
                            @click="changeType(type, close)"
                        >
                            {{ type }}
                        </UButton>
                    </div>

                    <USeparator />

                    <UButton
                        color="error"
                        variant="ghost"
                        size="sm"
                        block
                        @click="removeRedaction(close)"
                    >
                        {{ t("redact.editor.remove") }}
                    </UButton>
                </div>
            </template>
        </UPopover>
    </NodeViewWrapper>
</template>
