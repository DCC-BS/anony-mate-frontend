import type { DropdownMenuItem } from "@nuxt/ui";
import type { StoredDetection } from "~/types/storedDocument";

/** What the menu can ask of the detection it was opened on. */
export interface DetectionMenuActions {
    relabel: (id: string, label: string) => void;
    decide: (id: string, state: StoredDetection["state"]) => void;
    decideAll: (text: string, state: StoredDetection["state"]) => void;
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
            [
                {
                    label: t("review.accept"),
                    icon: "i-lucide-check",
                    onSelect: () => actions.decide(detection.id, "accepted"),
                },
                {
                    label: t("review.reject"),
                    icon: "i-lucide-x",
                    onSelect: () => actions.decide(detection.id, "rejected"),
                },
            ],
            [
                {
                    label: t("review.acceptAllOccurrencesShort"),
                    icon: "i-lucide-check-check",
                    onSelect: () =>
                        actions.decideAll(detection.text, "accepted"),
                },
                {
                    label: t("review.rejectAllOccurrencesShort"),
                    icon: "i-lucide-x-circle",
                    onSelect: () =>
                        actions.decideAll(detection.text, "rejected"),
                },
            ],
        ];
    });

    return { open, at, items, openAt, labelOf };
}
