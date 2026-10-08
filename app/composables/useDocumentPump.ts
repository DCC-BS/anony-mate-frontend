import { db } from "~/stores/db";
import type { StoredDocument } from "~/types/storedDocument";
import { scanUploadedPdf } from "~/utils/redactDocument";

/**
 * Works staged documents off, one at a time.
 *
 * The queue is owned entirely by the browser: the API holds no task state, so
 * this reads IndexedDB for what is left rather than keeping a list of its own.
 *
 * @param queuePositions - Where to record a document's place in the API's own
 *   queue while it waits; transient, so it is held by the caller in memory.
 * @returns Whether it is running, and how to start it.
 */
export function useDocumentPump(
    queuePositions: Ref<Record<string, number | null>>,
) {
    const { updateDocument, replaceDetections, replaceMarks } =
        getDocumentService();
    const logger = useLogger();
    const { t } = useI18n();

    const isProcessing = ref(false);

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

    /** Puts one document through the API and stores what comes back. */
    async function processDocument(document: StoredDocument): Promise<void> {
        try {
            if (document.pdfReview && document.file) {
                await scanPdf(document);
                return;
            }

            const result = await runDetection(document);

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
     * Has a PDF scanned for the review here and stores the marks it found.
     *
     * The upload stays on the document: the review draws the marks over the
     * original, and the annotated PDF is written from it later.
     */
    async function scanPdf(document: StoredDocument): Promise<void> {
        await updateDocument(document.id, { status: "converting" });
        const result = await scanUploadedPdf(document, {
            onQueuePosition: (position) => {
                queuePositions.value[document.id] = position;
            },
            onScanning: () =>
                void updateDocument(document.id, { status: "redacting" }),
        });

        const detectionCount = await replaceMarks(document.id, result);

        await updateDocument(document.id, {
            status: "ready",
            pageSizes: Object.fromEntries(
                Object.entries(result.page_sizes).map(
                    ([page, [width, height]]) => [page, { width, height }],
                ),
            ),
            detectionCount,
        });
    }

    /**
     * Sends one document to the API, by whichever route it still needs.
     *
     * A document that has been through conversion carries its text, so it goes
     * straight to detection — which is also what makes re-detecting one cheap.
     */
    function runDetection(document: StoredDocument) {
        const onQueuePosition = (position: number | null) => {
            queuePositions.value[document.id] = position;
        };

        if (document.text) {
            return updateDocument(document.id, { status: "redacting" }).then(
                () => redactStoredText(document, { onQueuePosition }),
            );
        }

        return updateDocument(document.id, { status: "converting" }).then(() =>
            redactUploadedFile(document, {
                onQueuePosition,
                onScanning: () =>
                    void updateDocument(document.id, { status: "redacting" }),
            }),
        );
    }

    return { isProcessing, pump, recoverInterrupted };
}
