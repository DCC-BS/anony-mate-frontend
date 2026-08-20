<script lang="ts" setup>
import { type JSONContent, Node } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor, VueNodeViewRenderer } from "@tiptap/vue-3";
import RedactPill from "~~/app/components/RedactPill.vue";
import type { EntityColor } from "~~/app/utils/entityColors";

interface RedactEditorProps {
    originalText: string;
    entities: Record<string, Entity[]>;
    availableTypes: string[];
}

const props = defineProps<RedactEditorProps>();

const reviewDirty = defineModel<boolean>("reviewDirty", { default: false });

const { t } = useI18n();
const copied = ref(false);
let initialized = false;

watch(
    () => props.availableTypes,
    (types) => {
        editorAvailableTypes.value = types ?? [];
    },
    { immediate: true }
);

const Redaction = Node.create({
    name: "redaction",
    group: "inline",
    inline: true,
    atom: true,
    selectable: false,
    addAttributes() {
        return {
            id: { default: "" },
            label: { default: "" },
            text: { default: "" },
            confidence: { default: 0 }
        };
    },
    parseHTML() {
        return [{ tag: "span[data-redaction]" }];
    },
    renderHTML({ HTMLAttributes }) {
        return ["span", { "data-redaction": "", ...HTMLAttributes }];
    },
    addNodeView() {
        return VueNodeViewRenderer(RedactPill);
    }
});

const editor = useEditor({
    editable: false,
    extensions: [
        StarterKit.configure({
            heading: false,
            bold: false,
            italic: false,
            strike: false,
            underline: false,
            code: false,
            codeBlock: false,
            blockquote: false,
            bulletList: false,
            orderedList: false,
            listItem: false,
            link: false,
            horizontalRule: false,
            hardBreak: false,
            dropcursor: false,
            gapcursor: false
        }),
        Redaction
    ],
    onCreate({ editor }) {
        editor.commands.setContent(buildContent());
        initialized = true;
    },
    onUpdate() {
        if (initialized) {
            reviewDirty.value = true;
        }
    }
});

const hasEntities = computed(
    () => Object.keys(props.entities ?? {}).length > 0
);

const entityCount = computed(() =>
    Object.values(props.entities ?? {})
        .flat().length
);

const foundTypes = computed(() =>
    [...new Set(
        Object.entries(props.entities ?? {})
            .filter(([, list]) => list.length > 0)
            .map(([name]) => name)
    )]
);

const DOT_CLASSES: Record<EntityColor, string> = {
    primary: "bg-(--ui-primary)",
    secondary: "bg-(--ui-secondary)",
    success: "bg-(--ui-success)",
    info: "bg-(--ui-info)",
    warning: "bg-(--ui-warning)",
    error: "bg-(--ui-error)"
};

function dotClass(name: string): string {
    return DOT_CLASSES[entityColor(name)];
}

const flatEntities = computed(() =>
    Object.values(props.entities ?? {})
        .flat()
        .sort((a, b) => a.start - b.start)
);

function buildContent(): JSONContent {
    if (!props.originalText || !flatEntities.value.length) {
        return { type: "doc", content: [{ type: "paragraph", content: [] }] };
    }

    const nodes: JSONContent[] = [];
    let cursor = 0;

    for (const entity of flatEntities.value) {
        const start = Math.max(cursor, entity.start);
        const end = Math.min(props.originalText.length, entity.end);

        if (start > cursor) {
            nodes.push({
                type: "text",
                text: props.originalText.slice(cursor, start)
            });
        }

        nodes.push({
            type: "redaction",
            attrs: {
                id: entity.id,
                label: entity.label,
                text: entity.text,
                confidence: entity.confidence
            }
        });

        cursor = Math.max(cursor, end);
    }

    if (cursor < props.originalText.length) {
        nodes.push({
            type: "text",
            text: props.originalText.slice(cursor)
        });
    }

    return { type: "doc", content: [{ type: "paragraph", content: nodes }] };
}

watch(
    [() => props.originalText, flatEntities],
    () => {
        if (editor.value) {
            editor.value.commands.setContent(buildContent());
            reviewDirty.value = false;
        }
    }
);

function copyResult() {
    if (!editor.value) {
        return;
    }

    const text = editor.value
        .getJSON()
        .content?.flatMap((block) => block.content ?? [])
        .map((node: JSONContent) => {
            if (node.type === "text") {
                return node.text ?? "";
            }
            if (node.type === "redaction") {
                const { label = "", id = "" } = node.attrs ?? {};
                return `[${label}:${id}]`;
            }
            return "";
        })
        .join("");

    navigator.clipboard.writeText(text ?? "").then(() => {
        copied.value = true;
        setTimeout(() => (copied.value = false), 1500);
    });
}
</script>

<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5 text-sm font-semibold text-(--ui-text-highlighted)">
                    <UIcon name="i-lucide-file-search" class="size-4" />
                    {{ t("redact.editor.title") }}
                </div>
                <UBadge
                    v-if="entityCount"
                    color="primary"
                    variant="soft"
                    size="sm"
                >
                    {{ t("redact.editor.entityCount", { count: entityCount }) }}
                </UBadge>
            </div>

            <div class="flex items-center gap-1">
                <UButton
                    icon="i-lucide-undo-2"
                    variant="ghost"
                    size="sm"
                    :disabled="!editor?.can().undo()"
                    :aria-label="t('redact.editor.undo')"
                    @click="editor?.chain().focus().undo().run()"
                />
                <UButton
                    icon="i-lucide-redo-2"
                    variant="ghost"
                    size="sm"
                    :disabled="!editor?.can().redo()"
                    :aria-label="t('redact.editor.redo')"
                    @click="editor?.chain().focus().redo().run()"
                />
                <UButton
                    icon="i-lucide-copy"
                    size="sm"
                    variant="outline"
                    :disabled="!hasEntities"
                    @click="copyResult"
                >
                    {{ copied ? t("redact.editor.copied") : t("redact.editor.copy") }}
                </UButton>
            </div>
        </div>

        <div class="rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/30 p-4">
            <div
                v-if="!hasEntities"
                class="flex flex-col items-center justify-center gap-3 py-8 text-center"
            >
                <span class="flex size-12 items-center justify-center rounded-full bg-(--ui-bg-elevated)">
                    <UIcon name="i-lucide-eye-off" class="size-6 text-(--ui-text-muted)" />
                </span>
                <div class="max-w-xs space-y-1">
                    <p class="text-sm font-medium text-(--ui-text-highlighted)">
                        {{ t("redact.editor.emptyTitle") }}
                    </p>
                    <p class="text-xs text-(--ui-text-muted)">
                        {{ t("redact.editor.empty") }}
                    </p>
                </div>
            </div>

            <template v-else>
                <EditorContent :editor="editor" />

                <USeparator class="my-3" />

                <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span class="text-xs font-medium text-(--ui-text-muted)">
                        {{ t("redact.editor.legend") }}:
                    </span>
                    <span
                        v-for="type in foundTypes"
                        :key="type"
                        class="flex items-center gap-1.5 text-xs text-(--ui-text-toned)"
                    >
                        <span class="size-2 rounded-full" :class="dotClass(type)" />
                        {{ type }}
                    </span>
                </div>
            </template>
        </div>
    </div>
</template>
