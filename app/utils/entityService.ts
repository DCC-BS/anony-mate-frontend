import { v4 as uuidv4 } from "uuid";
import { db } from "~/stores/db";
import {
    type StoredBlacklistTerm,
    type StoredEntityGroup,
    StoredEntityGroupSchema,
    type StoredEntityType,
    StoredEntityTypeSchema,
} from "~/types/storedEntity";

/** Presets the API serves; seeded into IndexedDB as the built-in groups. */
const BUILTIN_PRESETS: EntityTypePreset[] = ["default", "legal", "full"];

/**
 * Persistence layer for entity types, detection groups and never-redact terms.
 *
 * @returns The entity service operations.
 */
export function getEntityService() {
    function getTypes(): Promise<StoredEntityType[]> {
        return db.entityTypes.toArray();
    }

    function getGroups(): Promise<StoredEntityGroup[]> {
        return db.entityGroups.toArray();
    }

    /**
     * Stores an entity type, replacing one of the same name.
     */
    async function saveType(type: StoredEntityType): Promise<void> {
        // Editing a built-in makes it the user's: the preset refresh leaves it
        // alone from here on.
        await db.entityTypes.put(
            StoredEntityTypeSchema.parse({
                ...type,
                customised: type.customised || type.builtin,
            }),
        );
    }

    /**
     * Renames an entity type and updates every group that references it.
     *
     * @param oldName - Current name.
     * @param newName - New name; ignored when it already exists.
     */
    async function renameType(oldName: string, newName: string): Promise<void> {
        if (oldName === newName || (await db.entityTypes.get(newName))) {
            return;
        }

        await db.transaction(
            "rw",
            [db.entityTypes, db.entityGroups],
            async () => {
                const type = await db.entityTypes.get(oldName);
                if (!type) {
                    return;
                }

                await db.entityTypes.delete(oldName);
                await db.entityTypes.put({ ...type, name: newName });
                await db.entityGroups.toCollection().modify((group) => {
                    group.labels = group.labels.map((label) =>
                        label === oldName ? newName : label,
                    );
                });
            },
        );
    }

    /**
     * Deletes a custom entity type and removes it from every group.
     */
    async function deleteType(name: string): Promise<void> {
        await db.transaction(
            "rw",
            [db.entityTypes, db.entityGroups],
            async () => {
                await db.entityTypes.delete(name);
                await db.entityGroups.toCollection().modify((group) => {
                    group.labels = group.labels.filter(
                        (label) => label !== name,
                    );
                });
            },
        );
    }

    /**
     * Creates or updates a group.
     *
     * @param group - The group; an id is generated when missing.
     * @returns The stored group.
     */
    async function saveGroup(
        group: Omit<StoredEntityGroup, "id"> & { id?: string },
    ): Promise<StoredEntityGroup> {
        const stored = StoredEntityGroupSchema.parse({
            ...group,
            id: group.id ?? uuidv4(),
        });

        await db.entityGroups.put(stored);
        return stored;
    }

    async function deleteGroup(id: string): Promise<void> {
        await db.entityGroups.delete(id);
    }

    /**
     * The entity types of a group, as the API wants them: name -> description.
     */
    async function groupPayload(
        groupId: string,
    ): Promise<Record<string, string>> {
        const group = await db.entityGroups.get(groupId);
        if (!group) {
            return {};
        }

        const types = await db.entityTypes
            .where("name")
            .anyOf(group.labels)
            .toArray();

        return Object.fromEntries(
            types.map((type) => [type.name, type.description]),
        );
    }

    function getBlacklist(): Promise<StoredBlacklistTerm[]> {
        return db.blacklist.orderBy("createdAt").toArray();
    }

    async function addBlacklistTerm(term: string): Promise<void> {
        await db.blacklist.put({ term: term.trim(), createdAt: new Date() });
    }

    async function removeBlacklistTerm(term: string): Promise<void> {
        await db.blacklist.delete(term);
    }

    /**
     * Brings the built-in presets in line with the API, on every run.
     *
     * A type's description is not a caption: it is sent to the detection model
     * and is most of what it has to go on, so an improved one has to reach a
     * browser that already seeded the old one. Types the user has edited, and
     * group membership they have changed, are left alone.
     *
     * @param fetchPreset - Loads one preset's types from the API.
     */
    async function syncBuiltins(
        fetchPreset: (
            preset: EntityTypePreset,
        ) => Promise<Record<string, ApiEntityType>>,
    ): Promise<void> {
        const presets: Record<string, ApiEntityType>[] = [];

        for (const preset of BUILTIN_PRESETS) {
            const types = await fetchPreset(preset);
            presets.push(types);

            for (const [name, presetType] of Object.entries(types)) {
                const stored = await db.entityTypes.get(name);
                // Leave alone anything the user owns: a type they wrote
                // themselves, or a preset they have since edited.
                if (stored && (!stored.builtin || stored.customised)) {
                    continue;
                }

                await db.entityTypes.put(
                    StoredEntityTypeSchema.parse({
                        ...stored,
                        name,
                        displayName: presetType.name,
                        description: presetType.description,
                        replacement: stored?.replacement ?? DEFAULT_REPLACEMENT,
                        builtin: true,
                    }),
                );
            }

            // A built-in group is the preset: its membership follows the API,
            // so a label added to a preset reaches a browser that already has
            // it. A user wanting their own selection copies it into a group of
            // their own.
            const existing = await db.entityGroups
                .filter((group) => group.builtin && group.name === preset)
                .first();

            await saveGroup({
                ...(existing ?? {}),
                name: preset,
                description: existing?.description ?? "",
                labels: Object.keys(types),
                builtin: true,
            });
        }

        await pruneBuiltins(
            new Set(presets.flatMap((types) => Object.keys(types))),
        );
    }

    /**
     * Drops built-in types no preset mentions any more.
     *
     * A preset can rename or retire a label, and the type it left behind would
     * otherwise sit in the list for good. Anything the user wrote or edited is
     * theirs and stays.
     */
    async function pruneBuiltins(inUse: Set<string>): Promise<void> {
        const stale = await db.entityTypes
            .filter(
                (type) =>
                    type.builtin && !type.customised && !inUse.has(type.name),
            )
            .toArray();

        await db.entityTypes.bulkDelete(stale.map((type) => type.name));
    }

    return {
        getTypes,
        getGroups,
        saveType,
        renameType,
        deleteType,
        saveGroup,
        deleteGroup,
        groupPayload,
        getBlacklist,
        addBlacklistTerm,
        removeBlacklistTerm,
        syncBuiltins,
    };
}
