import type { DetectionState, StoredDetection } from "~/types/storedDocument";
import { StoredDetectionSchema } from "~/types/storedDocument";

/**
 * The changes a review can make to a document's detections.
 *
 * Every one goes through the command history, so every one can be taken back.
 * Kept apart from the views the review takes of the same list: nothing here
 * derives anything, and nothing there writes.
 *
 * @param documentId - Document whose detections are being edited.
 * @param detections - The detections the review is working on.
 * @returns The editing operations.
 */
export function useDetectionEditing(
    documentId: MaybeRefOrGetter<string>,
    detections: MaybeRefOrGetter<StoredDetection[]>,
) {
    const { edit } = useDetectionCommands(documentId);

    /** Rewrites whichever detections a filter picks out, through the history. */
    function change(
        pick: (detection: StoredDetection) => boolean,
        into: (detection: StoredDetection) => StoredDetection,
    ): Promise<void> {
        const before = toValue(detections).filter(pick);
        return edit(before, before.map(into));
    }

    /** Redacts or un-redacts one detection. */
    function setState(id: string, state: DetectionState): Promise<void> {
        return change(
            (detection) => detection.id === id,
            (detection) => ({ ...detection, state }),
        );
    }

    /** Applies the same decision to every detection of one entity type. */
    function setGroupState(
        label: string,
        state: DetectionState,
    ): Promise<void> {
        return change(
            (detection) => detection.label === label,
            (detection) => ({ ...detection, state }),
        );
    }

    /**
     * Applies the same decision to every detection with the same text, so a
     * name occurring dozens of times is decided once.
     */
    function setAllOccurrences(
        text: string,
        state: DetectionState,
    ): Promise<void> {
        return change(
            (detection) => detection.text === text,
            (detection) => ({ ...detection, state }),
        );
    }

    /** Applies one decision to every detection in the document. */
    function setAllStates(state: DetectionState): Promise<void> {
        return change(
            (detection) => detection.state !== state,
            (detection) => ({ ...detection, state }),
        );
    }

    /**
     * Records a detection the reader marked by hand.
     *
     * It arrives redacted: marking words is how a reader says they must not be
     * read, so the mark takes effect at once. Numbering is redone for the whole
     * label so the new one takes its place in document order rather than being
     * appended.
     *
     * Marking words that already carry a detection of this type revives it,
     * which is what brings back one the reader had un-redacted — so the search
     * is over every detection, not only the ones currently shown.
     *
     * @param all - Every detection the document holds, filtered or not.
     * @param label - Entity type to file it under.
     * @param start - Character offset the mention starts at.
     * @param end - Character offset it ends at.
     * @param text - The marked words.
     */
    function addDetection(
        all: StoredDetection[],
        label: string,
        start: number,
        end: number,
        text: string,
    ): Promise<void> {
        const id = `${toValue(documentId)}:${label}:${start}`;
        const existing = all.find((detection) => detection.id === id);
        const marked = StoredDetectionSchema.parse({
            ...(existing ?? {}),
            id,
            documentId: toValue(documentId),
            label,
            text,
            start,
            end,
            confidence: 1,
            state: "redacted",
        });

        // Words the reader un-redacted keep their row, so marking them again is
        // how they take that back: the detection returns, rather than the mark
        // landing on an id that is already taken and being dropped.
        return edit(existing ? [existing] : [], [marked]);
    }

    /** Moves a detection to a different entity type, keeping its decision. */
    function relabel(id: string, label: string): Promise<void> {
        const detection = toValue(detections).find((item) => item.id === id);
        if (!detection || detection.label === label) {
            return Promise.resolve();
        }

        // The id carries the label, so a relabelled detection is a new row and
        // the old one goes away with it.
        return edit(
            [detection],
            [
                StoredDetectionSchema.parse({
                    ...detection,
                    id: `${toValue(documentId)}:${label}:${detection.start}`,
                    label,
                }),
            ],
        );
    }

    return {
        setState,
        setGroupState,
        setAllOccurrences,
        setAllStates,
        addDetection,
        relabel,
    };
}
