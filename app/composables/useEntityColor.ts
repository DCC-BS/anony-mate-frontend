/** Hues the built-in types have always had, kept so they stay recognisable. */
const BUILTIN_HUES: Record<string, number> = {
    person: 25,
    location: 255,
    organization: 195,
    date: 90,
    phone_number: 290,
};

/** Hues handed to custom types, wide enough apart to tell apart at a glance. */
const ENTITY_HUES = [
    340, 150, 65, 305, 200, 15, 100, 285, 180, 45, 220,
] as const;

export interface EntityColor {
    /** Solid colour for dots and borders. */
    solid: string;
    /** Translucent fill for inline highlights. */
    soft: string;
}

/** Fallback slot for a label that is no longer a stored entity type. */
function hashOf(label: string): number {
    let hash = 0;
    for (let index = 0; index < label.length; index++) {
        hash = (hash * 31 + label.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
}

/** The colour in a given slot of the palette. */
function colorAt(slot: number): EntityColor {
    return colorOfHue(ENTITY_HUES[slot % ENTITY_HUES.length] as number);
}

function colorOfHue(hue: number): EntityColor {
    return {
        solid: `oklch(0.55 0.13 ${hue})`,
        soft: `oklch(0.55 0.13 ${hue} / 0.16)`,
    };
}

/**
 * Colour registry for entity types.
 *
 * The built-in types keep their established hues. Custom types follow their
 * alphabetical position among the stored types, so a type keeps its colour
 * across documents, reloads and devices, and no two collide while there are
 * fewer of them than hues. Hashing the name instead would be simpler but pairs
 * up types at random — `person` and `phone_number` land on the same hue.
 *
 * @returns A lookup function for an entity type's colour.
 */
export function useEntityColor() {
    const { types } = useEntityGroups();

    /**
     * Colour per entity type, built once per change to the stored types.
     *
     * The document draws one element per detection and asks for a colour on
     * every one of them, so this is a map lookup rather than a scan: searching
     * the ordered list per detection is what made a document with thousands of
     * them slow to redraw.
     */
    const colors = computed(() => {
        const order = types.value
            .map((type) => type.name)
            .filter((name) => !(name in BUILTIN_HUES))
            .sort((a, b) => a.localeCompare(b));

        return new Map(
            order.map((name, index) => [name, colorAt(index)] as const),
        );
    });

    /**
     * Colour assigned to an entity type.
     *
     * @param label - Entity type name.
     * @returns The colour for that type.
     */
    function getEntityColor(label: string): EntityColor {
        const builtin = BUILTIN_HUES[label];
        if (builtin !== undefined) {
            return colorOfHue(builtin);
        }

        return colors.value.get(label) ?? colorAt(hashOf(label));
    }

    return { getEntityColor };
}
