import type { Entity, PdfAnnotationsResult } from "#shared/types/redactTypes";
import { PdfAnnotationsResultSchema } from "#shared/types/redactTypes";
import type { StoredDocument } from "~/types/storedDocument";

/** What a run at the API gives back, whatever route it took to get there. */
export interface RedactionResult {
    /** The document's text, as converted if it had to be. */
    text: string;
    pageOffsets: number[];
    /** `text` with every detection written as its placeholder. */
    redactedText: string;
    entities: Record<string, Entity[]>;
}

/** How a run reports on itself while it is out. */
export interface RedactionProgress {
    /** Place in the API's queue, while it waits on a busy service. */
    onQueuePosition: (position: number | null) => void;
    /** The conversion is done and the scan has started. */
    onScanning: () => void;
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
 * Converts and redacts an uploaded document in one submission.
 *
 * The file travels, the text does not: the API keeps what it converted and
 * scans it there, rather than handing the largest thing this app carries back
 * for the browser to send in again.
 *
 * @param document - The document, with the upload still on it.
 * @param progress - Where to report the queue position and the handover.
 * @returns The converted text and what was found in it.
 */
export async function redactUploadedFile(
    document: StoredDocument,
    progress: RedactionProgress,
): Promise<RedactionResult> {
    const formData = new FormData();
    formData.append("file", document.file as Blob, document.name);
    formData.append("options", JSON.stringify(redactOptions(document)));

    let isScanning = false;
    const result = await runApiTask(
        () =>
            $fetch<unknown>("/api/redact-document", {
                method: "POST",
                body: formData,
                headers: { "X-Client-Id": clientId() },
            }),
        DocumentRedactResultSchema,
        ({ progress: fraction, queuePosition }) => {
            progress.onQueuePosition(queuePosition);

            // One task covers both halves and only the scan reports a
            // fraction, so its first one says conversion is done.
            if (fraction !== null && !isScanning) {
                isScanning = true;
                progress.onScanning();
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

/** A PDF handed back with a redaction mark on every detection. */
export interface MarkedPdfResult {
    file: Blob;
    /** Number of redaction marks on it. */
    markCount: number;
}

/**
 * Sends an uploaded PDF to be scanned for redaction, for the review here.
 *
 * The PDF itself never comes back: the caller keeps the file, and what the
 * API answers with is what it found — every mention as a mark with its boxes
 * on the page — for the interface to draw over the original. The blacklist
 * goes along and the API leaves its words unmarked, where the text path
 * applies it client-side.
 *
 * @param document - The document, with the upload still on it.
 * @param progress - Where to report the queue position and the handover.
 * @returns The marks and the size of each page they stand on.
 */
export async function scanUploadedPdf(
    document: StoredDocument,
    progress: RedactionProgress,
): Promise<PdfAnnotationsResult> {
    const formData = new FormData();
    formData.append("file", document.file as Blob, document.name);
    formData.append(
        "options",
        JSON.stringify({
            ...redactOptions(document),
            blacklist: document.blacklist,
            pdf_annotations: true,
        }),
    );

    let isScanning = false;
    const result = await runApiTask(
        () =>
            $fetch<unknown>("/api/redact-document", {
                method: "POST",
                body: formData,
                headers: { "X-Client-Id": clientId() },
            }),
        PdfAnnotationsResultSchema,
        ({ progress: fraction, queuePosition }) => {
            progress.onQueuePosition(queuePosition);

            // One task covers both halves and only the scan reports a
            // fraction, so its first one says conversion is done.
            if (fraction !== null && !isScanning) {
                isScanning = true;
                progress.onScanning();
            }
        },
    );
    return result;
}

/**
 * Scans text that never needed converting: text the reader pasted in, or a
 * document already converted and now being detected again.
 *
 * @param document - The document, with its text.
 * @param progress - Where to report the queue position.
 * @returns The text and what was found in it.
 */
export async function redactStoredText(
    document: StoredDocument,
    progress: Pick<RedactionProgress, "onQueuePosition">,
): Promise<RedactionResult> {
    const result = await runApiTask(
        () =>
            $fetch<unknown>("/api/redact", {
                method: "POST",
                headers: { "X-Client-Id": clientId() },
                body: { text: document.text, ...redactOptions(document) },
            }),
        RedactResultSchema,
        ({ queuePosition }) => progress.onQueuePosition(queuePosition),
    );

    return {
        text: document.text,
        pageOffsets: document.pageOffsets,
        redactedText: result.text,
        entities: result.entities,
    };
}

/** What the export needs for one mark: its id and, when chosen, its overlay. */
export interface AnnotationExport {
    id: string;
    label: string;
    confidence: number;
    text: string;
    boxes: {
        page: number;
        left: number;
        top: number;
        right: number;
        bottom: number;
    }[];
    overlay?: string | null;
}

/**
 * Has the reviewed marks of a PDF written onto the PDF itself.
 *
 * The marks leave as they were decided: only the ones the reader kept, each
 * named by its id, with the overlay where the redaction style is a
 * placeholder. What comes back is the PDF for an editor such as Kofax Power
 * PDF to apply.
 *
 * @param file - The original PDF, as uploaded.
 * @param name - The document's name, which the marked file is named after.
 * @param annotations - The reviewed marks.
 * @param onQueuePosition - Where to report the place in the API's queue.
 * @returns The annotated PDF.
 */
export async function writeAnnotatedPdf(
    file: Blob,
    name: string,
    annotations: AnnotationExport[],
    onQueuePosition: (position: number | null) => void,
): Promise<Blob> {
    const resourceId = await awaitApiTask(
        () => {
            const formData = new FormData();
            formData.append("file", file, name);
            formData.append("options", JSON.stringify({ annotations }));
            return $fetch<unknown>("/api/annotate-pdf", {
                method: "POST",
                body: formData,
                headers: { "X-Client-Id": clientId() },
            });
        },
        ({ queuePosition }) => onQueuePosition(queuePosition),
    );

    const response = await $fetch.raw<Blob>(`/api/annotate-pdf/${resourceId}`, {
        responseType: "blob",
    });
    return response._data as Blob;
}
