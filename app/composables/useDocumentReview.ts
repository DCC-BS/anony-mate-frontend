import { db } from "~/stores/db";
import type { StoredDetection, StoredDocument } from "~/types/storedDocument";

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

    const { counts, groups, occurrenceCount } = useDetectionGroups(detections);

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

    const {
        setState,
        setGroupState,
        setAllOccurrences,
        setAllStates,
        addDetection: recordDetection,
        relabel,
    } = useDetectionEditing(documentId, detections);

    /** Records a detection the reader marked by hand. */
    function addDetection(
        label: string,
        start: number,
        end: number,
        text: string,
    ): Promise<void> {
        // Over every detection, not only the ones above the confidence the
        // review is showing: marking words that carry a filtered-out detection
        // must revive that row rather than collide with it.
        return recordDetection(allDetections.value, label, start, end, text);
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
