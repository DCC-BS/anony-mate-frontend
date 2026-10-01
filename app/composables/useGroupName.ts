import type { StoredEntityGroup } from "~/types/storedEntity";

/**
 * The names entity groups are shown under.
 *
 * A built-in group is named after its API preset — `default`, `legal`, `full`
 * — which stays its identifier; it is shown under the preset's translated name.
 * A group the user made is shown under the name they gave it.
 *
 * @returns Lookups for a group's name and for a group name a document stored.
 */
export function useGroupName() {
    const { t, te } = useI18n();

    function presetName(name: string): string | undefined {
        const key = `redact.preset.${name}`;
        return te(key) ? t(key) : undefined;
    }

    /**
     * Name of an entity group.
     *
     * @param group - The group.
     * @returns The name to show it under.
     */
    function groupName(
        group: Pick<StoredEntityGroup, "name" | "builtin">,
    ): string {
        return (group.builtin && presetName(group.name)) || group.name;
    }

    /**
     * Name of the group a document was detected with.
     *
     * A document keeps the group's name as it was; a preset's is translated.
     *
     * @param stored - The group's name, as the document stored it.
     * @returns The name to show it under.
     */
    function documentGroupName(stored: string): string {
        return presetName(stored) ?? stored;
    }

    return { groupName, documentGroupName };
}
