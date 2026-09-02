/**
 * The names entity types are shown under.
 *
 * A label is what the detection model reads — `ahv-nummer`, `e-mail-adresse` —
 * and the name is what a reader sees and what a replacement is written from.
 * A type without one is shown under its label.
 *
 * @returns A lookup function for an entity type's name.
 */
export function useEntityName() {
    const { types } = useEntityGroups();

    const names = computed(
        () =>
            new Map(
                types.value.map((type) => [
                    type.name,
                    type.displayName || type.name,
                ]),
            ),
    );

    /**
     * Name of an entity type.
     *
     * @param label - Entity type label.
     * @returns The name to show it under.
     */
    function entityName(label: string): string {
        return names.value.get(label) ?? label;
    }

    return { entityName };
}
