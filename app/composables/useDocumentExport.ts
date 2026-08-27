import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";

/** How an accepted detection is written into the exported document. */
export type RedactionStyle = "placeholder" | "blacked";

/** Character used to black out redacted text. */
const BLACK_BLOCK = "█";

/** Marker md-to-docx turns into a Word page break. */
const DOCX_PAGE_BREAK = "\n\n<!-- pagebreak -->\n\n";

/**
 * Builds the redacted document and downloads it in the chosen format.
 *
 * Mirrors transcribo's export composable: build the content, wrap it in a
 * Blob and hand it to a temporary anchor.
 *
 * @returns The export operations.
 */
export function useDocumentExport() {
    /**
     * Applies the accepted detections to the text.
     *
     * @param text - The original document text.
     * @param detections - The document's detections.
     * @param style - Placeholder (`person-1`) or blacked (`████`).
     * @param replacements - Replacement template per entity type.
     * @returns The redacted text.
     */
    function buildRedactedText(
        text: string,
        detections: StoredDetection[],
        style: RedactionStyle,
        replacements: Record<string, string> = {},
    ): string {
        const accepted = detections
            .filter((detection) => detection.state === "accepted")
            .sort((a, b) => a.start - b.start);

        let result = "";
        let cursor = 0;

        for (const detection of accepted) {
            if (detection.start < cursor) {
                continue; // overlaps the previous replacement
            }

            result += text.slice(cursor, detection.start);
            result +=
                style === "blacked"
                    ? BLACK_BLOCK.repeat(
                          Math.max(1, detection.end - detection.start),
                      )
                    : replacementFor(detection, replacements[detection.label]);
            cursor = detection.end;
        }

        return result + text.slice(cursor);
    }

    /**
     * Triggers a browser download for the given content.
     */
    function download(content: Blob, filename: string): void {
        const url = URL.createObjectURL(content);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        anchor.click();

        URL.revokeObjectURL(url);
    }

    /**
     * One page as it reads once the accepted detections are applied, ready to
     * render or export.
     *
     * @param page - The page slice.
     * @param style - Placeholder or blacked.
     * @param replacements - Replacement template per entity type.
     * @returns The page markdown.
     */
    function renderPage(
        page: DocumentPage,
        style: RedactionStyle,
        replacements: Record<string, string> = {},
    ): string {
        return restoreTableHeader(
            buildRedactedText(page.text, page.detections, style, replacements),
            page.tableHeader,
        );
    }

    /** Filename without extension, derived from the document name. */
    function baseName(name: string): string {
        return name.replace(/\.[^.]+$/, "");
    }

    function exportAsMarkdown(name: string, content: string): void {
        download(
            new Blob([content], { type: "text/markdown" }),
            `${baseName(name)}.md`,
        );
    }

    function exportAsText(name: string, content: string): void {
        download(
            new Blob([content], { type: "text/plain" }),
            `${baseName(name)}.txt`,
        );
    }

    /**
     * Exports as a Word document; the converter is loaded on demand because it
     * only runs in the browser.
     */
    async function exportAsDocx(name: string, pages: string[]): Promise<void> {
        const { convertMarkdownToDocx } = await import("@mohtasham/md-to-docx");
        const blob = await convertMarkdownToDocx(pages.join(DOCX_PAGE_BREAK));

        download(blob, `${baseName(name)}.docx`);
    }

    return {
        renderPage,
        exportAsMarkdown,
        exportAsText,
        exportAsDocx,
    };
}
