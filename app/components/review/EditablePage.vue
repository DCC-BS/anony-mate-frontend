<script lang="ts" setup>
import type { DocumentPage } from "~/composables/useDocumentPages";
import type { ReviewTool } from "~/composables/useDocumentReview";
import type { StoredDetection } from "~/types/storedDocument";

const props = defineProps<{
    page: DocumentPage;
    /** Replacement template per entity type, for the tooltips. */
    replacements: Record<string, string>;
    /** The tool in the reader's hand: the cursor changes with it. */
    tool?: ReviewTool;
    /** Cursor while marking, and the one shown over an existing detection. */
    nib?: string;
    eraser?: string;
}>();
const emit = defineEmits<{
    select: [detection: StoredDetection];
    menu: [event: MouseEvent, detection: StoredDetection];
}>();

const { getEntityColor } = useEntityColor();
const { entityName } = useEntityName();

/**
 * The page's runs, each already carrying how it is drawn.
 *
 * Built once per change rather than in the template: a document carries
 * thousands of runs, and working out a colour and a tooltip for every one of
 * them on every redraw is what a reader feels as a stutter.
 */
const segments = computed(() =>
    segmentsOf(props.page).map((segment) =>
        segment.kind === "detection"
            ? { ...segment, ...presentationOf(segment.detection) }
            : segment,
    ),
);

/** How the page's cursor reads, from the tool in the reader's hand. */
const toolStyle = computed(() => {
    if (props.tool === "mark") {
        return { cursor: props.nib };
    }
    if (props.tool === "erase") {
        return { cursor: props.eraser };
    }
    return undefined;
});

/** A detection keeps the eraser while erasing; otherwise it points. */
function detectionStyle(part: { style: Record<string, string> }) {
    return [part.style, props.tool === "erase" ? { cursor: props.eraser } : {}];
}

/** How one detection is drawn and what its tooltip says. */
function presentationOf(detection: StoredDetection) {
    const colour = getEntityColor(detection.label);
    const isRedacted = detection.state === "redacted";
    const name = entityName(detection.label);
    const confidence = `${Math.round(detection.confidence * 100)}%`;

    return {
        // Redacted reads as taken out — filled, solid outline. Un-redacted
        // keeps the outline, dotted and empty, so the reader can still see the
        // detection is there and put it back.
        style: {
            background: isRedacted ? colour.soft : "transparent",
            borderColor: colour.solid,
            borderStyle: isRedacted ? "solid" : "dotted",
        },
        // What it will become is only worth saying while it is being taken out.
        title: isRedacted
            ? `${name} · ${confidence} · ${replacementFor(detection, props.replacements[detection.label])}`
            : `${name} · ${confidence}`,
    };
}
</script>

<template>
    <div
        class="whitespace-pre-wrap wrap-break-word"
        :style="toolStyle"
    >
        <template v-for="(part, index) in segments" :key="index">
            <span
                v-if="part.kind === 'text'"
                :data-offset="part.start"
            >{{ part.text }}</span>

            <button
                v-else
                :id="`detection-${part.detection.id}`"
                type="button"
                :data-offset="part.start"
                :data-end="part.end"
                class="detection-mark inline cursor-pointer rounded border px-0.5 text-left leading-tight"
                :style="detectionStyle(part)"
                :title="part.title"
                @click="emit('select', part.detection)"
                @contextmenu.prevent="emit('menu', $event, part.detection)"
            >{{ part.text }}</button>
        </template>
    </div>
</template>
