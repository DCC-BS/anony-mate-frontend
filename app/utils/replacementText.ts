import type { StoredDetection } from "~/types/storedDocument";

/** Fallback when an entity type has no replacement of its own. */
export const DEFAULT_REPLACEMENT = "{label}-{subject}";

/**
 * Renders how a detection is written once it is redacted.
 *
 * @param detection - The detection to replace.
 * @param template - The entity type's replacement, e.g. `Person-{subject}`.
 * @returns The replacement text.
 *
 * @example
 * replacementFor({ label: "person", subjectIndex: 1, occurrenceIndex: 4 }, "{label}-{subject}")
 * // "person-1"
 */
export function replacementFor(
    detection: Pick<
        StoredDetection,
        "label" | "subjectIndex" | "occurrenceIndex"
    >,
    template: string = DEFAULT_REPLACEMENT,
): string {
    return (template || DEFAULT_REPLACEMENT)
        .replaceAll("{label}", detection.label)
        .replaceAll("{subject}", String(detection.subjectIndex))
        .replaceAll("{occurrence}", String(detection.occurrenceIndex));
}
