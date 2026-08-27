import { createSharedComposable } from "@vueuse/core";
import { db } from "~/stores/db";
import type { StoredDocument } from "~/types/storedDocument";

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
    /** Undecided detections per document, for the "reviewed" status. */
    const openDetections = useLiveQuery(
        () => db.detections.where("state").equals("open").toArray(),
        [],
    );
    const openCounts = computed(() => {
        const counts: Record<string, number> = {};

        for (const detection of openDetections.value) {
            counts[detection.documentId] =
                (counts[detection.documentId] ?? 0) + 1;
        }

        return counts;
    });

    const isProcessing = ref(false);

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
     * Converts a document when needed, then redacts it.
     */
    async function processDocument(document: StoredDocument): Promise<void> {
        try {
            let text = document.text;

            if (!text && document.file) {
                await updateDocument(document.id, { status: "converting" });
                const converted = await convert(document);
                text = converted.text;
                await updateDocument(document.id, {
                    text,
                    pageOffsets: converted.page_offsets,
                });
            }

            await updateDocument(document.id, { status: "redacting" });
            const result = await redact(document, text);
            const detectionCount = await replaceDetections(
                document.id,
                result.entities,
                document.blacklist,
            );

            await updateDocument(document.id, {
                status: "ready",
                redactedText: result.text,
                detectionCount,
                // The upload is only needed to retry a failed conversion.
                file: undefined,
            });
        } catch (error) {
            logger.error({ error }, "Document processing failed");
            await updateDocument(document.id, {
                status: "failed",
                errorMessage: t("documents.status.failedHint"),
            });
        }
    }

    async function convert(document: StoredDocument) {
        const formData = new FormData();
        formData.append("file", document.file as Blob, document.name);

        const response = await $fetch("/api/convert", {
            method: "POST",
            body: formData,
        });

        return ConversionResultSchema.parse(response);
    }

    async function redact(document: StoredDocument, text: string) {
        const response = await $fetch("/api/redact", {
            method: "POST",
            body: {
                text,
                entity_types: document.entityTypes,
                threshold: document.threshold,
                // Blacklisting happens client-side, so a term added later
                // applies without asking the API again.
                blacklist: [],
            },
        });

        return RedactResultSchema.parse(response);
    }

    /**
     * Puts a failed document back in the queue.
     */
    async function retry(id: string): Promise<void> {
        await updateDocument(id, { status: "staged", errorMessage: undefined });
        void pump();
    }

    return {
        documents,
        openCounts,
        pending,
        activeDocument,
        isProcessing,
        progress,
        pump,
        retry,
    };
});
