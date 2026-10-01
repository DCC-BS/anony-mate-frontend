/** File types the backend accepts (mirrors validate_mimetype in the API). */
export const UPLOAD_ACCEPT =
    ".pdf,.docx,.pptx,.xlsx,.csv,.html,.adoc,.md,.txt,.png,.jpg,.jpeg,.tiff,.bmp,.gif,.webp";

/**
 * Whether a file is a PDF, the only kind that can come back marked for
 * redaction. Judged by its type, or by its name when the browser gives none.
 */
export function isPdf(file: Blob & { name?: string }): boolean {
    return (
        file.type === "application/pdf" ||
        (file.name ?? "").toLowerCase().endsWith(".pdf")
    );
}

/** The name a marked PDF is saved under: `bericht.pdf` becomes `bericht.markiert.pdf`. */
export function markedPdfName(name: string): string {
    const stem = name.replace(/\.pdf$/i, "");
    return `${stem}.markiert.pdf`;
}
