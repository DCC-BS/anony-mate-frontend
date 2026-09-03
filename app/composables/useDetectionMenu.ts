import type { DropdownMenuItem } from "@nuxt/ui";
import type { DetectionState, StoredDetection } from "~/types/storedDocument";

/** What the menu can ask of the detection it was opened on. */
export interface DetectionMenuActions {
    relabel: (id: string, label: string) => void;
    setState: (id: string, state: DetectionState) => void;
    setAllOccurrences: (text: string, state: DetectionState) => void;
}

/**
 * The right-click menu for a detection.
 *
 * One menu serves the whole document. A menu component per detection means
 * thousands of component instances, which is what made a large document slow
 * to open and to scroll; the elements themselves are cheap.
 *
 * @param labels - Entity types this document was detected with.
 * @param actions - What each entry does.
 */
export function useDetectionMenu(
    labels: MaybeRefOrGetter<string[]>,
    actions: DetectionMenuActions,
) {
    const { t } = useI18n();
    const { entityName } = useEntityName();

    const open = ref(false);
    const target = ref<StoredDetection>();
    const at = ref({ x: 0, y: 0 });

    function openAt(event: MouseEvent, detection: StoredDetection): void {
        target.value = detection;
        at.value = { x: event.clientX, y: event.clientY };
        open.value = true;
    }

    /** The entity type a menu row stands for, where it stands for one. */
    function labelOf(item: unknown): string | undefined {
        const value = (item as { value?: unknown })?.value;
        return typeof value === "string" ? value : undefined;
    }

    const items = computed<DropdownMenuItem[][]>(() => {
        const detection = target.value;
        if (!detection) {
            return [];
        }

        const isRedacted = detection.state === "redacted";

        return [
            [
                {
                    label: t("review.relabel"),
                    icon: "i-lucide-tag",
                    // A document can carry dozens of entity types, so the
                    // submenu searches rather than asking the reader to read a
                    // long list.
                    filter: { placeholder: t("review.marker.search") },
                    // The submenu is nudged up by default; squaring the offset
                    // lines its search field up with the row it opened from.
                    content: { alignOffset: 0 },
                    children: toValue(labels)
                        .filter((label) => label !== detection.label)
                        .map((label) => ({
                            label: entityName(label),
                            value: label,
                            onSelect: () =>
                                actions.relabel(detection.id, label),
                        })),
                },
            ],
            // Only the move this detection can make: the state it is already in
            // would be an entry that does nothing.
            [
                isRedacted
                    ? {
                          label: t("review.unredact"),
                          icon: "i-lucide-eye",
                          onSelect: () =>
                              actions.setState(detection.id, "unredacted"),
                      }
                    : {
                          label: t("review.redact"),
                          icon: "i-lucide-eye-off",
                          onSelect: () =>
                              actions.setState(detection.id, "redacted"),
                      },
            ],
            [
                {
                    label: t("review.redactAllOccurrencesShort"),
                    icon: "i-lucide-eye-off",
                    onSelect: () =>
                        actions.setAllOccurrences(detection.text, "redacted"),
                },
                {
                    label: t("review.unredactAllOccurrencesShort"),
                    icon: "i-lucide-eye",
                    onSelect: () =>
                        actions.setAllOccurrences(detection.text, "unredacted"),
                },
            ],
        ];
    });

    return { open, at, items, openAt, labelOf };
}
