/** Matches a GFM delimiter row, e.g. `| --- | :--: |`. */
const DELIMITER_ROW = /^\s*\|[\s:|-]+\|\s*$/;

const TABLE_ROW = /^\s*\|.*\|\s*$/;

/**
 * The header of a table that is still open where the text breaks off.
 *
 * @param before - Everything preceding the page.
 * @returns Header and delimiter row, or undefined if no table is left open.
 */
export function openTableHeader(before: string): string | undefined {
    const lines = before.split("\n");
    const last = lines.findLast((line) => line.trim().length > 0);

    if (last === undefined || !TABLE_ROW.test(last)) {
        return undefined;
    }

    const delimiter = lines.findLastIndex((line) => DELIMITER_ROW.test(line));
    const header = lines[delimiter - 1];

    return delimiter < 1 || header === undefined || !TABLE_ROW.test(header)
        ? undefined
        : `${header}\n${lines[delimiter]}`;
}

/**
 * Restores the header of a table that a page break cut in half.
 *
 * Docling breaks pages by position, so a table continuing onto the next page
 * arrives without its header and reads its first data row as one instead.
 *
 * Runs on markdown about to be rendered, never on text that detection offsets
 * point into: it changes lengths.
 *
 * @param page - Markdown of the page that may start mid-table.
 * @param header - The open table's header, from `openTableHeader`.
 * @returns The page markdown, with the header restored when one was missing.
 *
 * @example
 * restoreTableHeader("| b |\n| --- |", "| h |\n| --- |")
 * // "| h |\n| --- |\n| b |"
 */
export function restoreTableHeader(page: string, header?: string): string {
    const lines = page.split("\n");
    const first = lines.findIndex((line) => line.trim().length > 0);

    if (
        header === undefined ||
        first === -1 ||
        !TABLE_ROW.test(lines[first] ?? "")
    ) {
        return page;
    }

    // Docling repeats a delimiter of its own; drop it so the header lines up.
    const body = lines
        .slice(first)
        .filter((line, index) => !(index === 1 && DELIMITER_ROW.test(line)));

    return [header, ...body].join("\n");
}
