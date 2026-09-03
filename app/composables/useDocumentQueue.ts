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
    const { updateDocument, replaceDetections, cleanupOldDocuments } =
        getDocumentService();
    const logger = useLogger();
    const { t } = useI18n();

    const documents = useLiveQuery<StoredDocument[]>(
        () => db.documents.orderBy("createdAt").reverse().toArray(),
        [],
    );
    const isProcessing = ref(false);
    /**
     * Place in the API's queue per document, while it is waiting on a busy
     * downstream service. Transient by nature, so it stays in memory rather
     * than in IndexedDB: a reload re-submits and gets a fresh position.
     */
    const queuePositions = ref<Record<string, number | null>>({});

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
     * Returns documents left mid-flight by a reload to the queue. Their request
     * died with the page, and the API kept nothing, so they start over.
     */
    async function recoverInterrupted(): Promise<void> {
        const interrupted = await db.documents
            .filter(
                (document) =>
                    document.status === "converting" ||
                    document.status === "redacting",
            )
            .toArray();

        for (const document of interrupted) {
            await updateDocument(document.id, { status: "staged" });
        }
    }

    /**
     * Processes staged documents one after another until none are left. The
     * API is CPU-bound, so documents are never processed in parallel.
     */
    async function pump(): Promise<void> {
        if (isProcessing.value) {
            return;
        }
        isProcessing.value = true;

        try {
            let next = await db.documents
                .where("status")
                .equals("staged")
                .first();

            while (next) {
                await processDocument(next);
                next = await db.documents
                    .where("status")
                    .equals("staged")
                    .first();
            }
        } finally {
            isProcessing.value = false;
        }
    }

    /**
     * Puts one document through the API and stores what comes back.
     *
     * An upload goes as a file and comes back converted and scanned; pasted
     * text only needs scanning.
     */
    async function processDocument(document: StoredDocument): Promise<void> {
        try {
            const result = document.text
                ? await redactText(document, document.text)
                : await redactFile(document);

            const detectionCount = await replaceDetections(
                document.id,
                result.entities,
                document.blacklist,
            );

            await updateDocument(document.id, {
                status: "ready",
                text: result.text,
                pageOffsets: result.pageOffsets,
                redactedText: result.redactedText,
                detectionCount,
                // The upload is only needed to retry a failed run.
                file: undefined,
            });
        } catch (error) {
            logger.error({ error }, "Document processing failed");
            await updateDocument(document.id, {
                status: "failed",
                errorMessage: t("documents.status.failedHint"),
            });
        } finally {
            delete queuePositions.value[document.id];
        }
    }

    /**
     * Converts and redacts an uploaded document in one submission.
     *
     * The file travels, the text does not: the API keeps what it converted and
     * scans it there, rather than handing the largest thing this app carries
     * back for the browser to send in again.
     */
    async function redactFile(document: StoredDocument) {
        await updateDocument(document.id, { status: "converting" });

        const formData = new FormData();
        formData.append("file", document.file as Blob, document.name);
        formData.append("options", JSON.stringify(redactOptions(document)));

        const result = await runApiTask(
            () =>
                $fetch<unknown>("/api/redact-document", {
                    method: "POST",
                    body: formData,
                    headers: { "X-Client-Id": clientId() },
                }),
            DocumentRedactResultSchema,
            ({ progress, queuePosition }) => {
                queuePositions.value[document.id] = queuePosition;

                // One task covers both halves and only the scan reports a
                // fraction, so its first one says conversion is done.
                if (progress !== null && document.status !== "redacting") {
                    document.status = "redacting";
                    void updateDocument(document.id, { status: "redacting" });
                }
            },
        );

        return {
            text: result.text,
            pageOffsets: result.page_offsets,
            redactedText: result.redacted_text,
            entities: result.entities,
        };
    }

    /** Scans text the reader pasted in, which never needed converting. */
    async function redactText(document: StoredDocument, text: string) {
        await updateDocument(document.id, { status: "redacting" });

        const result = await runApiTask(
            () =>
                $fetch<unknown>("/api/redact", {
                    method: "POST",
                    headers: { "X-Client-Id": clientId() },
                    body: { text, ...redactOptions(document) },
                }),
            RedactResultSchema,
            ({ queuePosition }) => {
                queuePositions.value[document.id] = queuePosition;
            },
        );

        return {
            text,
            pageOffsets: document.pageOffsets,
            redactedText: result.text,
            entities: result.entities,
        };
    }

    /** What the API needs to know beyond the text itself. */
    function redactOptions(document: StoredDocument) {
        return {
            entity_types: document.entityTypes,
            threshold: document.threshold,
            // Blacklisting happens client-side, so a term added later applies
            // without asking the API again.
            blacklist: [],
        };
    }

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
