import type { DocumentPage } from "~/composables/useDocumentPages";
import type { StoredDetection } from "~/types/storedDocument";

/** How a redacted detection is written into the exported document. */
export type RedactionStyle = "placeholder" | "blacked";

/** Character used to black out redacted text. */
const BLACK_BLOCK = "█";

/** Marker md-to-docx turns into a Word page break. */
const DOCX_PAGE_BREAK = "\n\n<!-- pagebreak -->\n\n";

/** Text as an HTML attribute value can carry it. */
function escapeAttribute(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

/**
 * Wraps a detection in the markdown so the review can address it.
 *
 * The preview is markdown, not components, so a detection has no element of
 * its own to scroll to or to hover — this gives it one. The tooltip carries the
 * words the redaction stands for, which is the only place they are still
 * readable once the preview has replaced them.
 */
function anchored(
    detection: StoredDetection,
    written: string,
    original: string,
): string {
    return `<span id="detection-${escapeAttribute(detection.id)}" class="detection-mark" title="${escapeAttribute(original)}">${written}</span>`;
}

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
     * Applies the redacted detections to the text.
     *
     * @param text - The original document text.
     * @param detections - The document's detections.
     * @param style - Placeholder (`Person-1`) or blacked (`████`).
     * @param replacements - Replacement template per entity type.
     * @param anchors - Wrap each detection so the review can find it on screen.
     * @returns The redacted text.
     */
    function buildRedactedText(
        text: string,
        detections: StoredDetection[],
        style: RedactionStyle,
        replacements: Record<string, string> = {},
        anchors = false,
    ): string {
        const ordered = [...detections].sort((a, b) => a.start - b.start);

        let result = "";
        let cursor = 0;

        for (const detection of ordered) {
            if (detection.start < cursor) {
                continue; // overlaps the previous replacement
            }

            const original = text.slice(detection.start, detection.end);
            const written =
                detection.state !== "redacted"
                    ? original
                    : style === "blacked"
                      ? BLACK_BLOCK.repeat(
                            Math.max(1, detection.end - detection.start),
                        )
                      : replacementFor(
                            detection,
                            replacements[detection.label],
                        );

            result += text.slice(cursor, detection.start);
            result += anchors
                ? anchored(detection, written, original)
                : written;
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
     * One page as it reads once the redactions are applied, ready to
     * render or export.
     *
     * @param page - The page slice.
     * @param style - Placeholder or blacked.
     * @param replacements - Replacement template per entity type.
     * @param options - `anchors` marks each detection up so the review can
     *   scroll to it and show what it stands for; an export leaves them out.
     * @returns The page markdown.
     */
    function renderPage(
        page: DocumentPage,
        style: RedactionStyle,
        replacements: Record<string, string> = {},
        options: { anchors?: boolean } = {},
    ): string {
        return restoreTableHeader(
            buildRedactedText(
                page.text,
                page.detections,
                style,
                replacements,
                options.anchors,
            ),
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
