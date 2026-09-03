import { createSharedComposable } from "@vueuse/core";
import { db } from "~/stores/db";
import type { StoredDocument } from "~/types/storedDocument";
import type { StoredEntityGroup } from "~/types/storedEntity";

/** Statuses that mean the document still needs work. */
const UNFINISHED: StoredDocument["status"][] = [
    "staged",
    "converting",
    "redacting",
];

/**
 * Drives queued documents through conversion and redaction.
 *
 * The queue is owned entirely by the browser: the API holds no task state, so
 * a reload simply re-reads IndexedDB and picks up whatever is unfinished.
 *
 * Shared across the app: one queue, however many components read it.
 *
 * @returns The queue state and its operations.
 */
export const useDocumentQueue = createSharedComposable(() => {
    const { updateDocument, cleanupOldDocuments } = getDocumentService();

    const documents = useLiveQuery<StoredDocument[]>(
        () => db.documents.orderBy("createdAt").reverse().toArray(),
        [],
    );
    /**
     * Place in the API's queue per document, while it is waiting on a busy
     * downstream service. Transient by nature, so it stays in memory rather
     * than in IndexedDB: a reload re-submits and gets a fresh position.
     */
    const queuePositions = ref<Record<string, number | null>>({});

    const { isProcessing, pump, recoverInterrupted } =
        useDocumentPump(queuePositions);

    const pending = computed(() =>
        documents.value.filter((document) =>
            UNFINISHED.includes(document.status),
        ),
    );
    const activeDocument = computed(() =>
        documents.value.find(
            (document) =>
                document.status === "converting" ||
                document.status === "redacting",
        ),
    );
    /** Share of the queue that is finished, for the overall progress bar. */
    const progress = computed(() => {
        if (documents.value.length === 0) {
            return 0;
        }
        const done = documents.value.length - pending.value.length;
        return Math.round((done / documents.value.length) * 100);
    });

    onMounted(async () => {
        await cleanupOldDocuments();
        await recoverInterrupted();
        void pump();
    });

    /**
     * Puts a failed document back in the queue.
     */
    async function retry(id: string): Promise<void> {
        await updateDocument(id, { status: "staged", errorMessage: undefined });
        void pump();
    }

    /**
     * Detects the document again with another set of entity types.
     *
     * The conversion is not repeated: a document that has been through it
     * carries its text, and the queue sends text straight to detection. What
     * comes back replaces the detections wholesale, so every decision the
     * reader had recorded is gone with them.
     *
     * @param id - Document to detect again.
     * @param group - Detection group to use this time.
     * @param entityTypes - That group's entity types, as the API wants them.
     */
    async function recompute(
        id: string,
        group: Pick<StoredEntityGroup, "id" | "name">,
        entityTypes: Record<string, string>,
    ): Promise<void> {
        await updateDocument(id, {
            status: "staged",
            errorMessage: undefined,
            entityTypes,
            entityGroupId: group.id,
            entityGroupName: group.name,
        });

        // The queue reports progress through the document's own status, so the
        // caller follows it there rather than waiting on the whole drain.
        void pump();
    }

    return {
        documents,
        queuePositions,
        pending,
        activeDocument,
        isProcessing,
        progress,
        pump,
        retry,
        recompute,
    };
});
