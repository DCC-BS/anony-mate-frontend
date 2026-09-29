/**
 * Triggers a browser download for the given content.
 *
 * @param content - What to save.
 * @param filename - The name the browser offers to save it under.
 */
export function downloadBlob(content: Blob, filename: string): void {
    const url = URL.createObjectURL(content);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
}
