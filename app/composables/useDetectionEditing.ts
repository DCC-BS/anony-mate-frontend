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

    /**
     * Records a mark the reader drew by hand on a PDF page.
     *
     * The words the rectangle covers are guessed from the page's text layer;
     * where it covers none (a picture, a scan), the mark arrives without
     * text, like the API's picture marks. Either way it is certain:
     * confidence 1 keeps it above every threshold, as with a hand-marked
     * word. Its span is synthetic — appended after everything the document
     * holds, in the same family as the API marks' offsets — so the id is
     * fresh (no revival collision, as a rectangle covers new ground) and the
     * sidebar sorts it last.
     *
     * @param all - Every detection the document holds, filtered or not.
     * @param label - Entity type to file it under.
     * @param boxes - The drawn area, one box in page points.
     * @param text - The words the rectangle covers, if the page has any.
     */
    function addMark(
        all: StoredDetection[],
        label: string,
        boxes: NonNullable<StoredDetection["boxes"]>,
        text = "",
    ): Promise<void> {
        const start = all.reduce(
            (latest, detection) => Math.max(latest, detection.end),
            0,
        );
        const marked = StoredDetectionSchema.parse({
            id: `${toValue(documentId)}:${label}:${start}`,
            documentId: toValue(documentId),
            label,
            text,
            start,
            end: start + 1,
            confidence: 1,
            state: "redacted",
            boxes,
            manual: true,
        });
        return edit([], [marked]);
    }

    /**
     * Takes a detection out of the document for good.
     *
     * A decision changes how a mention is written; removing it says the
     * mention is not sensitive at all, so the row goes and the words are
     * plain text again. The command history still holds it, so it can be
     * brought back with undo like any other edit.
     */
    function removeDetection(id: string): Promise<void> {
        const detection = toValue(detections).find((item) => item.id === id);
        return detection ? edit([detection], []) : Promise.resolve();
    }

    /**
     * Rewrites a mark's content: the guess was wrong, or the reader wants
     * the placeholder to say something else. The id and the boxes stay; the
     * renumbering regroups same-text marks, so a mention renamed onto an
     * existing value joins its numbering.
     */
    function renameDetection(id: string, text: string): Promise<void> {
        const detection = toValue(detections).find((item) => item.id === id);
        return detection && detection.text !== text
            ? edit([detection], [{ ...detection, text }])
            : Promise.resolve();
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
        addMark,
        renameDetection,
        removeDetection,
        relabel,
    };
}
