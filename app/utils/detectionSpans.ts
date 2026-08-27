import type { Entity } from "#shared/types/redactTypes";

/** Markdown structure that may sit at the edge of a detection. */
const STRUCTURE_EDGE = /^[\s|#>*_-]+|[\s|#>*_-]+$/g;

/** Structure a detection must never span: cell and line boundaries. */
const STRUCTURE_INSIDE = /[|\n\r]/;

const HAS_CONTENT = /[\p{L}\p{N}]/u;

/**
 * Narrows a detection to the text it is actually about.
 *
 * Detections come from the model as character spans over the markdown, so a
 * badly extracted table can yield spans like `" | |--"` that are pure table
 * syntax. Replacing those would splice a placeholder into the table and break
 * the rendering, so structure is trimmed off the edges and a detection that
 * still spans a cell or line boundary is dropped.
 *
 * @param entity - The detection as the model reported it.
 * @returns The detection narrowed to its content, or undefined if nothing is left.
 *
 * @example
 * tidyEntitySpan({ text: "| Rainer", start: 10, end: 18 })
 * // { text: "Rainer", start: 12, end: 18 }
 */
export function tidyEntitySpan<T extends Entity>(entity: T): T | undefined {
    const text = entity.text.replace(STRUCTURE_EDGE, "");

    if (!text || STRUCTURE_INSIDE.test(text) || !HAS_CONTENT.test(text)) {
        return undefined;
    }

    const start = entity.start + entity.text.indexOf(text);

    return { ...entity, text, start, end: start + text.length };
}
