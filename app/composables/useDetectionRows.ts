import type { DetectionGroup } from "~/composables/useDetectionGroups";
import type { StoredDetection } from "~/types/storedDocument";

/** One line of the detections list: a group's header, or a detection under it. */
export type DetectionRow =
    | {
          kind: "group";
          id: string;
          label: string;
          count: number;
          unredactedCount: number;
          expanded: boolean;
      }
    | { kind: "item"; id: string; detection: StoredDetection };

/**
 * Measured row heights. The virtualiser sizes the scrollbar from these until a
 * row has been rendered and measured, so an estimate that is too small makes
 * the track grow while the reader drags it and the list appears to stop short
 * of the end.
 */
const ROW_HEIGHT = { item: 58, group: 37, groupExpanded: 69 };

/**
 * Groups and their detections as one flat list, searched and expandable.
 *
 * A document can carry thousands of detections, and rendering them all at once
 * is what makes the sidebar crawl. Flattening lets a single virtualised scroll
 * area mount only the rows on screen, which needs one list rather than a
 * scroller per group.
 *
 * @param groups - The detections, grouped by entity type.
 * @param hasGroupActions - Whether an open group shows its bulk actions, which
 *   is the difference between the two header heights.
 * @returns The rows, the search box's text, and what to expand.
 */
export function useDetectionRows(
    groups: MaybeRefOrGetter<DetectionGroup[]>,
    hasGroupActions: MaybeRefOrGetter<boolean>,
) {
    const query = ref("");
    /** Groups the reader has opened. */
    const expanded = ref(new Set<string>());

    function toggleGroup(label: string): void {
        const next = new Set(expanded.value);
        if (!next.delete(label)) {
            next.add(label);
        }
        expanded.value = next;
    }

    /** Groups filtered by the search box, empty groups dropped. */
    const visibleGroups = computed(() => {
        const needle = query.value.trim().toLowerCase();
        if (!needle) {
            return toValue(groups);
        }

        return toValue(groups)
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    item.text.toLowerCase().includes(needle),
                ),
            }))
            .filter((group) => group.items.length > 0);
    });

    const rows = computed<DetectionRow[]>(() =>
        visibleGroups.value.flatMap((group) => {
            const header = {
                kind: "group" as const,
                id: `group:${group.label}`,
                label: group.label,
                count: group.items.length,
                unredactedCount: group.unredactedCount,
                expanded: expanded.value.has(group.label),
            };

            if (!header.expanded) {
                return [header];
            }

            return [
                header,
                ...group.items.map((detection) => ({
                    kind: "item" as const,
                    id: detection.id,
                    detection,
                })),
            ];
        }),
    );

    /** How tall a row is likely to be, before it has been measured. */
    function estimateRow(index: number): number {
        const row = rows.value[index];
        if (!row || row.kind === "item") {
            return ROW_HEIGHT.item;
        }

        // The bulk actions the header opens onto are not there to measure while
        // the preview has them hidden.
        return row.expanded && toValue(hasGroupActions)
            ? ROW_HEIGHT.groupExpanded
            : ROW_HEIGHT.group;
    }

    return { query, rows, estimateRow, toggleGroup };
}
