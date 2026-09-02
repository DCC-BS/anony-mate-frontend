import { db } from "~/stores/db";
import type { StoredDetection, StoredDocument } from "~/types/storedDocument";
import { StoredDetectionSchema } from "~/types/storedDocument";

/** Which rendering of the document the review shows. */
export type DocumentView = "original" | "anonymised" | "blacked";

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

    const storedDocument = ref<StoredDocument>();
    /** True until the first lookup finishes, so the page can hold back the
     *  "not found" message instead of flashing it during hydration. */
    const isLoading = ref(true);
    const detections = useLiveQuery<StoredDetection[]>(
        () =>
            db.detections
                .where("documentId")
                .equals(toValue(documentId))
                .sortBy("start"),
        [],
    );

    const openDetections = computed(() =>
        detections.value.filter((detection) => detection.state === "open"),
    );
    const counts = computed(() => ({
        total: detections.value.length,
        open: openDetections.value.length,
        accepted: detections.value.filter((d) => d.state === "accepted").length,
        rejected: detections.value.filter((d) => d.state === "rejected").length,
    }));

    /** Detections grouped by entity type, each group sorted by position. */
    const groups = computed(() => {
        const byLabel = new Map<string, StoredDetection[]>();

        for (const detection of [...detections.value].sort(
            (a, b) => a.start - b.start,
        )) {
            byLabel.set(detection.label, [
                ...(byLabel.get(detection.label) ?? []),
                detection,
            ]);
        }

        return [...byLabel.entries()].map(([label, items]) => ({
            label,
            // Open first, decided sink to the bottom: once a detection is
            // settled it no longer needs looking at.
            items: [...items].sort(
                (a, b) =>
                    Number(a.state !== "open") - Number(b.state !== "open") ||
                    a.start - b.start,
            ),
            openCount: items.filter((item) => item.state === "open").length,
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

    onMounted(async () => {
        try {
            storedDocument.value = await db.documents.get(toValue(documentId));
        } finally {
            isLoading.value = false;
        }
    });

    /** Rewrites whichever detections a filter picks out, through the history. */
    function change(
        pick: (detection: StoredDetection) => boolean,
        into: (detection: StoredDetection) => StoredDetection,
    ): Promise<void> {
        const before = detections.value.filter(pick);
        return edit(before, before.map(into));
    }

    /** Records a decision for one detection. */
    function decide(
        id: string,
        state: StoredDetection["state"],
    ): Promise<void> {
        return change(
            (detection) => detection.id === id,
            (detection) => ({ ...detection, state }),
        );
    }

    /** Applies the same decision to every detection of one entity type. */
    function decideGroup(
        label: string,
        state: StoredDetection["state"],
    ): Promise<void> {
        return change(
            (detection) => detection.label === label,
            (detection) => ({ ...detection, state }),
        );
    }

    /** Applies one decision to every open detection in the document. */
    function decideAllOpen(state: StoredDetection["state"]): Promise<void> {
        return change(
            (detection) => detection.state === "open",
            (detection) => ({ ...detection, state }),
        );
    }

    /**
     * Applies the same decision to every detection with the same text, so a
     * name occurring dozens of times is decided once.
     */
    function decideAllOccurrences(
        text: string,
        state: StoredDetection["state"],
    ): Promise<void> {
        return change(
            (detection) => detection.text === text,
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
     * It arrives accepted: the reader picked the words and the label, so there
     * is nothing left to review. Numbering is redone for the whole label so the
     * new one takes its place in document order rather than being appended.
     *
     * Marking words that already carry a detection of this type revives it,
     * which is what brings back one the reader had thrown away.
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
        const existing = detections.value.find(
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
            state: "accepted",
        });

        // Words that were thrown away keep their row, so marking them again is
        // how a reader takes that back: the detection returns, rather than the
        // mark landing on an id that is already taken and being dropped.
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

    return {
        storedDocument,
        isLoading,
        detections,
        openDetections,
        counts,
        groups,
        replacements,
        decide,
        decideGroup,
        decideAllOccurrences,
        decideAllOpen,
        occurrenceCount,
        relabel,
        addDetection,
    };
}
