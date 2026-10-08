import type { StoredDetection } from "~/types/storedDocument";
import { downloadBlob } from "~/utils/downloadBlob";
import { writeAnnotatedPdf } from "~/utils/redactDocument";
import { replacementFor } from "~/utils/replacementText";
import { markedPdfName } from "~/utils/uploadTypes";

/**
 * Writes a PDF review's answer onto the PDF, as an annotated PDF.
 *
 * What is sent is exactly what the review decided: the marks the reader kept,
 * each named by its id, the placeholder written in where the redaction style
 * is a placeholder. The API marks the areas for an editor such as Kofax Power
 * PDF to apply; nothing here removes anything.
 *
 * @param documentId - Id of the document whose marks are written.
 * @param replacements - Replacement template per entity type.
 * @param blackout - Write the areas plain, rather than with their placeholder.
 * @returns The export action and whether it is running.
 */
export function usePdfExport(
    documentId: MaybeRefOrGetter<string>,
    replacements: MaybeRefOrGetter<Record<string, string>>,
    blackout: MaybeRefOrGetter<boolean>,
) {
    const { t } = useI18n();
    const toast = useToast();
    const logger = useLogger();
    const { entityName } = useEntityName();
    const { getDocument, updateDocument } = getDocumentService();

    const isExportingPdf = ref(false);

    async function exportAsPdf(detections: StoredDetection[]): Promise<void> {
        const document = await getDocument(toValue(documentId));
        if (!document?.file) {
            toast.add({
                title: t("export.pdfMissingFile"),
                color: "error",
                icon: "i-lucide-circle-alert",
            });
            return;
        }

        isExportingPdf.value = true;
        try {
            const templates = toValue(replacements);
            const annotations = detections
                .filter((detection) => detection.state === "redacted")
                .map((detection) => ({
                    id: detection.id,
                    label: detection.label,
                    confidence: detection.confidence,
                    text: detection.text,
                    boxes: detection.boxes ?? [],
                    overlay:
                        toValue(blackout) || !detection.text
                            ? null
                            : replacementFor(
                                  detection,
                                  templates[detection.label] ?? "",
                                  entityName(detection.label),
                              ),
                }));

            const marked = await writeAnnotatedPdf(
                document.file,
                document.name,
                annotations,
                () => {},
            );

            await updateDocument(toValue(documentId), { markedFile: marked });
            downloadBlob(marked, markedPdfName(document.name));

            toast.add({
                title: t("export.annotatedPdfDone"),
                color: "success",
                icon: "i-lucide-check",
            });
        } catch (error) {
            logger.error({ error }, "Annotated PDF export failed");
            toast.add({
                title: t("export.failed"),
                color: "error",
                icon: "i-lucide-circle-alert",
            });
        } finally {
            isExportingPdf.value = false;
        }
    }

    return { exportAsPdf, isExportingPdf };
}
