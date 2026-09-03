import type { DocumentPage } from "~/composables/useDocumentPages";

/**
 * Turns the review's current reading of a document into a file.
 *
 * What is exported is exactly what the preview shows — same pages, same
 * redaction style — so the two cannot say different things about the same
 * document.
 *
 * @param pages - The document's page slices, with their detections.
 * @param replacements - Replacement template per entity type.
 * @param blackout - Write redactions as black bars rather than placeholders.
 * @param name - The document's name, which the file is named after.
 * @returns The export action.
 */
export function useReviewExport(
    pages: MaybeRefOrGetter<DocumentPage[]>,
    replacements: MaybeRefOrGetter<Record<string, string>>,
    blackout: MaybeRefOrGetter<boolean>,
    name: MaybeRefOrGetter<string>,
) {
    const { t } = useI18n();
    const toast = useToast();
    const { exportAsMarkdown, exportAsText, exportAsDocx, renderPage } =
        useDocumentExport();

    /** The result pages of the current reading; docx breaks a page between them. */
    const exportPages = computed(() =>
        toValue(pages).map((page) =>
            renderPage(
                page,
                toValue(blackout) ? "blacked" : "placeholder",
                toValue(replacements),
            ),
        ),
    );

    /** Exports the current rendering in the chosen format. */
    async function exportAs(
        format: "markdown" | "text" | "docx" | "clipboard",
    ): Promise<void> {
        const filename = toValue(name);
        const content = exportPages.value.join("");

        if (format === "clipboard") {
            await navigator.clipboard.writeText(content);
            toast.add({
                title: t("export.copied"),
                color: "success",
                icon: "i-lucide-check",
            });
        } else if (format === "markdown") {
            exportAsMarkdown(filename, content);
        } else if (format === "text") {
            exportAsText(filename, content);
        } else {
            await exportAsDocx(filename, exportPages.value);
        }
    }

    return { exportAs };
}
