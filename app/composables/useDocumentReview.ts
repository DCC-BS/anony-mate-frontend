import { db } from "~/stores/db";
import type {
    DetectionState,
    StoredDetection,
    StoredDocument,
} from "~/types/storedDocument";
import { StoredDetectionSchema } from "~/types/storedDocument";

/** Which rendering of the document the review shows. */
export type DocumentView = "editor" | "preview";

/**
 * Loads one document with its detections and records the review decisions.
 *
 * Decisions are written straight to IndexedDB, so a reload picks the review up
 * exactly where it was left.
 *
 * @param documentId - Id of the document under review.
 * @returns The review state and its operations.
 */
export function useDocumentReview(documentId: MaybeRefOrGetter<string>) {
    const { edit } = useDetectionCommands(documentId);

    /**
     * Live rather than read once: a re-detection rewrites the row underneath
     * the open review, and the confidence slider writes to it.
     *
     * `undefined` means the lookup has not answered yet and `null` that it
     * answered with nothing, so the page can hold back the "not found" message
     * instead of flashing it while the query is still out.
     */
    const documentQuery = useLiveQuery<StoredDocument | null | undefined>(
        async () => (await db.documents.get(toValue(documentId))) ?? null,
        undefined,
    );
    const storedDocument = computed(() => documentQuery.value ?? undefined);
    const isLoading = computed(() => documentQuery.value === undefined);
    const allDetections = useLiveQuery<StoredDetection[]>(
        () =>
            db.detections
                .where("documentId")
                .equals(toValue(documentId))
                .sortBy("start"),
        [],
    );

    /** Lowest confidence the document holds anything for. */
    const thresholdFloor = computed(
        () => storedDocument.value?.threshold ?? DETECTION_THRESHOLD,
    );
    /** Lowest confidence the review shows, which starts at that floor. */
    const threshold = computed(
        () => storedDocument.value?.reviewThreshold ?? thresholdFloor.value,
    );

    /**
     * The detections the review works on.
     *
     * The confidence the document was detected with is the floor; raising it
     * afterwards drops the weaker detections out of the review and out of the
     * result, rather than leaving them on screen to be dismissed one by one.
     * A detection the reader marked by hand is certain and never filtered.
     */
    const detections = computed(() =>
        allDetections.value.filter(
            (detection) => detection.confidence >= threshold.value,
        ),
    );

    const counts = computed(() => {
        const redacted = detections.value.filter(
            (detection) => detection.state === "redacted",
        ).length;

        return {
            total: detections.value.length,
            redacted,
            unredacted: detections.value.length - redacted,
        };
    });

    /** Detections grouped by entity type, each group sorted by position. */
    const groups = computed(() => {
        const byLabel = new Map<string, StoredDetection[]>();

        for (const detection of detections.value) {
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

    const { types } = useEntityGroups();

    /** Replacement template per entity type, for the redacted renderings.
     *
     * `{name}` is filled in here: a type's name is the same wherever it is
     * written, so every reader of the map — the document, the export, the
     * preview — gets it without carrying the types around as well. */
    const replacements = computed(() =>
        Object.fromEntries(
            types.value.map((type) => [
                type.name,
                type.replacement.replaceAll(
                    "{name}",
                    type.displayName || type.name,
                ),
            ]),
        ),
    );

    /** Rewrites whichever detections a filter picks out, through the history. */
    function change(
        pick: (detection: StoredDetection) => boolean,
        into: (detection: StoredDetection) => StoredDetection,
    ): Promise<void> {
        const before = detections.value.filter(pick);
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
     * How often each detected text occurs. Counted once per change rather than
     * per lookup: the sidebar asks for every row it renders, and scanning the
     * whole list each time is quadratic on a document with thousands of them.
     */
    const occurrencesByText = computed(() => {
        const counts = new Map<string, number>();

        for (const detection of detections.value) {
            counts.set(detection.text, (counts.get(detection.text) ?? 0) + 1);
        }

        return counts;
    });

    /** How many detections share this text. */
    function occurrenceCount(text: string): number {
        return occurrencesByText.value.get(text) ?? 0;
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
     * which is what brings back one the reader had un-redacted.
     *
     * @param label - Entity type to file it under.
     * @param start - Character offset the mention starts at.
     * @param end - Character offset it ends at.
     * @param text - The marked words.
     */
    async function addDetection(
        label: string,
        start: number,
        end: number,
        text: string,
    ): Promise<void> {
        const id = `${toValue(documentId)}:${label}:${start}`;
        const existing = allDetections.value.find(
            (detection) => detection.id === id,
        );
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
     * Moves a detection to a different entity type, keeping its decision.
     */
    function relabel(id: string, label: string): Promise<void> {
        const detection = detections.value.find((item) => item.id === id);
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

    /**
     * Sets the confidence a detection needs to stay in the review.
     *
     * It is stored on the document rather than held in the page, so the
     * reader's choice survives leaving the review and coming back.
     */
    async function setThreshold(value: number): Promise<void> {
        const { updateDocument } = getDocumentService();
        await updateDocument(toValue(documentId), { reviewThreshold: value });
    }

    return {
        storedDocument,
        isLoading,
        detections,
        counts,
        groups,
        replacements,
        threshold,
        thresholdFloor,
        setState,
        setGroupState,
        setAllOccurrences,
        setAllStates,
        setThreshold,
        occurrenceCount,
        relabel,
        addDetection,
    };
}
