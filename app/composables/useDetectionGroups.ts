import type { StoredDetection } from "~/types/storedDocument";

/** One entity type's detections, as the review lists them. */
export interface DetectionGroup {
    label: string;
    items: StoredDetection[];
    /** How many the reader has taken the redaction off. */
    unredactedCount: number;
}

/**
 * The read-only views the review takes of a document's detections: how they
 * stand, how they group, and how often each text occurs.
 *
 * Kept apart from the review's own operations because nothing here writes:
 * every value is derived from the same list, and each is counted once per
 * change rather than once per reader.
 *
 * @param detections - The detections in document order.
 * @returns The derived counts, groups and lookup.
 */
export function useDetectionGroups(
    detections: MaybeRefOrGetter<StoredDetection[]>,
) {
    const counts = computed(() => {
        const all = toValue(detections);
        const redacted = all.filter(
            (detection) => detection.state === "redacted",
        ).length;

        return {
            total: all.length,
            redacted,
            unredacted: all.length - redacted,
        };
    });

    /** Detections grouped by entity type, each group in document order. */
    const groups = computed<DetectionGroup[]>(() => {
        const byLabel = new Map<string, StoredDetection[]>();

        for (const detection of toValue(detections)) {
            byLabel.set(detection.label, [
                ...(byLabel.get(detection.label) ?? []),
                detection,
            ]);
        }

        return [...byLabel.entries()].map(([label, items]) => ({
            label,
            // Document order, and only that. Sorting the decided ones to the
            // bottom would move a row out from under the click that decided
            // it, which reads as the detection vanishing.
            items,
            unredactedCount: items.filter((item) => item.state === "unredacted")
                .length,
        }));
    });

    /**
     * How often each detected text occurs. Counted once per change rather than
     * per lookup: the sidebar asks for every row it renders, and scanning the
     * whole list each time is quadratic on a document with thousands of them.
     */
    const occurrencesByText = computed(() => {
        const totals = new Map<string, number>();

        for (const detection of toValue(detections)) {
            totals.set(detection.text, (totals.get(detection.text) ?? 0) + 1);
        }

        return totals;
    });

    /** How many detections share this text. */
    function occurrenceCount(text: string): number {
        return occurrencesByText.value.get(text) ?? 0;
    }

    return { counts, groups, occurrenceCount };
}
