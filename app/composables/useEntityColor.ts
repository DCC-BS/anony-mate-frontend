/**
 * Hues taken from the design mockup's entity categories.
 */
const ENTITY_HUES = [
    25, 255, 200, 100, 305, 65, 340, 150, 180, 15, 285,
] as const;

export interface EntityColor {
    /** Solid colour for dots and borders. */
    solid: string;
    /** Translucent fill for inline highlights. */
    soft: string;
}

/**
 * Colour slots handed out in order of first appearance and kept for the
 * session, so an entity type keeps the same colour in every view. This mirrors
 * transcribo's speaker colour slots.
 */
const slots: string[] = [];

function slotOf(label: string): number {
    if (!slots.includes(label)) {
        slots.push(label);
    }
    return slots.indexOf(label);
}

/**
 * Colour registry for entity types.
 *
 * @returns A lookup function for an entity type's colour.
 */
export function useEntityColor() {
    /**
     * Colour assigned to an entity type.
     *
     * @param label - Entity type name.
     * @returns The colour for that type.
     */
    function getEntityColor(label: string): EntityColor {
        const hue = ENTITY_HUES[slotOf(label) % ENTITY_HUES.length] as number;

        return {
            solid: `oklch(0.55 0.13 ${hue})`,
            soft: `oklch(0.55 0.13 ${hue} / 0.16)`,
        };
    }

    return { getEntityColor };
}
