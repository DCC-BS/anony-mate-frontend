/**
 * The pointers the review's tools use.
 *
 * A cursor is an image, so its colour cannot come from CSS: the nib is an
 * inline SVG rebuilt when the type changes, and carries that type's colour. The
 * eraser stays black — it means the same thing whatever it is taking away.
 */
export function useMarkerCursor(colour: MaybeRefOrGetter<string>) {
    /** A marker nib: a caret with no serifs, as thick as the ink it lays down. */
    const nib = computed(() =>
        cursor(
            `<rect x="1.5" y="1.5" width="3" height="23" rx="1.1" fill="${toValue(colour)}"/>`,
            { width: 6, height: 26, x: 3, y: 13, fallback: "text" },
        ),
    );

    /** An eraser: clicking a detection in marking mode deletes it. */
    const eraser = computed(() =>
        cursor(
            `<g transform="rotate(38 13 13)">
                <rect x="4.5" y="8" width="17" height="10" rx="2" fill="#ffffff"
                      stroke="#1a1a1a" stroke-width="1.3"/>
                <path d="M4.5 13.4h17V16a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2Z"
                      fill="#1a1a1a"/>
            </g>`,
            { width: 26, height: 26, x: 13, y: 13, fallback: "pointer" },
        ),
    );

    return { nib, eraser };
}

/** One `cursor` value: the drawing, where it points, and what to fall back to. */
function cursor(
    body: string,
    box: {
        width: number;
        height: number;
        x: number;
        y: number;
        fallback: string;
    },
): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}">${body}</svg>`;
    const source = encodeURIComponent(svg.replace(/\s+/g, " ").trim());

    return `url("data:image/svg+xml,${source}") ${box.x} ${box.y}, ${box.fallback}`;
}
