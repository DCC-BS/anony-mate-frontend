<script lang="ts" setup>
import type { DetectionState, StoredDetection, StoredDocument } from "~/types/storedDocument";

/**
 * Where pdf.js reads its decoders and fonts from; static app assets.
 *
 * Absolute: the worker fetches these itself, and inside a blob worker a
 * root-relative URL has no base to resolve against.
 */
const assetUrl = (path: string) => `${window.location.origin}${path}`;
const PDFJS_ASSETS = {
    wasm: assetUrl("/pdfjs/wasm/"),
    standardFonts: assetUrl("/pdfjs/standard_fonts/"),
    cmaps: assetUrl("/pdfjs/cmaps/"),
};

/** How one mark is drawn: its fill and the line around it. */
interface AnnotationStyle {
    fill: string;
    stroke: string;
}

const props = defineProps<{
    /** The document under review; its file is the PDF the marks stand on. */
    document: StoredDocument;
    detections: StoredDetection[];
    /** The detection under the ring, if any. */
    selectedId?: string;
    /** Entity types this document was detected with, for relabelling. */
    labels: string[];
}>();
const emit = defineEmits<{
    select: [id: string | undefined];
    setState: [id: string, state: DetectionState];
    setAllOccurrences: [text: string, state: DetectionState];
    relabel: [id: string, label: string];
    removeDetection: [id: string];
}>();

const viewer = useTemplateRef<{ focusAnnotation: (id: string) => void }>(
    "viewer",
);

/**
 * The original PDF as the file URL the viewer reads it from.
 *
 * The document row is re-read from IndexedDB on every change of it — the
 * confidence slider among them — and each read hands back the blob as a
 * fresh instance. Keying the URL on the blob's identity would reload the
 * whole document on every slider step; its name and size are the same
 * content there, and those only change when a different file really was
 * stored, which is the only time a reload is wanted.
 */
const fileUrl = ref<string>();
let currentUrl: string | undefined;
let currentKey: string | undefined;
watch(
    () => {
        const file = props.document.file;
        return file ? `${file instanceof File ? file.name : "pdf"}:${file.size}` : undefined;
    },
    (key) => {
        if (key === currentKey) {
            return;
        }
        currentKey = key;
        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = undefined;
        }
        const file = props.document.file;
        if (!file || !key) {
            fileUrl.value = undefined;
            return;
        }
        currentUrl = URL.createObjectURL(file);
        fileUrl.value = currentUrl;
    },
    { immediate: true },
);
onUnmounted(() => {
    if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
    }
});

const { getEntityColor } = useEntityColor();
const { entityName } = useEntityName();

/**
 * How a mark is drawn over the page: its type's colour, filled where the
 * reader keeps the redaction, and where they have set it aside a hatch of
 * the plain paper showing through — a redaction that is not one reads as
 * crossed out, not as absent. Dashed on a picture, which covers no text.
 * The reader already looking at it is ringed in primary.
 */
function styleFor(
    annotation: { key: string },
    active: boolean,
): AnnotationStyle {
    const detection = props.detections.find((item) => item.id === annotation.key);
    const color = getEntityColor(detection?.label ?? "").solid;
    const redacted = detection?.state !== "unredacted";

    // The selection only widens the border: what the mark's state is stays
    // visible under the ring — active + redacted keeps its hatch, active +
    // un-redacted stays open — and the type's colour holds its ground
    // against the primary.
    if (!redacted) {
        return {
            fill: "transparent",
            stroke: active ? "var(--ui-primary)" : color,
        };
    }
    return {
        fill: `repeating-linear-gradient(135deg, transparent, transparent 3px, color-mix(in oklch, ${color} 33%, transparent) 3px, color-mix(in oklch, ${color} 33%, transparent) 5px)`,
        stroke: active ? "var(--ui-primary)" : color,
    };
}

interface PdfAnnotationLike {
    key: string;
    boxes: { page: number; left: number; top: number; right: number; bottom: number }[];
    page?: number | null;
    title?: string;
    dashed?: boolean;
}

/** The marks as the viewer draws them: one annotation per detection. */
const annotations = computed<PdfAnnotationLike[]>(() =>
    props.detections
        .filter((detection) => detection.boxes?.length)
        .map((detection) => ({
            key: detection.id,
            boxes: detection.boxes ?? [],
            page: detection.boxes?.[0]?.page ?? null,
            title: markTitle(detection),
            dashed: !detection.text,
        })),
);

function markTitle(detection: StoredDetection): string {
    const name = entityName(detection.label);
    const confidence = Math.round(detection.confidence * 100);
    return detection.text
        ? `${name} · ${confidence} % · «${detection.text}»`
        : `${name} · ${confidence} %`;
}

/** A click in the sidebar highlights and brings the mark into view. */
watch(
    () => props.selectedId,
    (id) => {
        if (id) {
            viewer.value?.focusAnnotation(id);
        }
    },
);

function onActivate(key: string): void {
    emit("select", key === props.selectedId ? undefined : key);
}

/**
 * The mark's context menu: one for the whole document, opened on right
 * click at the box, with the review's whole repertoire on the one mark —
 * and on every occurrence of its text, since a scan rarely shows a name
 * once. The component owns its open state; it is opened through its
 * exposed `openAt`.
 */
const menu = useTemplateRef<{ openAt: (event: MouseEvent, detection: StoredDetection) => void }>(
    "menu",
);

function onContextMenu(key: string, x: number, y: number): void {
    const detection = props.detections.find((item) => item.id === key);
    if (!detection) {
        return;
    }
    // The menu works on the mark under the pointer; ring it, so the menu's
    // entries read as its own.
    emit("select", key);
    menu.value?.openAt(new MouseEvent("contextmenu", { clientX: x, clientY: y }), detection);
}
</script>

<template>
    <PdfViewer
        v-if="fileUrl"
        ref="viewer"
        class="h-full min-h-0 rounded-(--ui-radius) border border-default bg-elevated/40"
        :file-url="fileUrl"
        :annotations="annotations"
        :active-key="props.selectedId ?? null"
        :style-for="styleFor"
        :wasm-url="PDFJS_ASSETS.wasm"
        :standard-font-data-url="PDFJS_ASSETS.standardFonts"
        :c-map-url="PDFJS_ASSETS.cmaps"
        @activate="onActivate"
        @contextmenu="onContextMenu"
    />

    <ReviewDetectionMenu
        ref="menu"
        :labels="props.labels"
        @relabel="(id, label) => emit('relabel', id, label)"
        @set-state="(id, state) => emit('setState', id, state)"
        @set-all-occurrences="(text, state) => emit('setAllOccurrences', text, state)"
        @remove-detection="(id) => emit('removeDetection', id)"
    />
</template>