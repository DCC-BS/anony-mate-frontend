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
const BUILTIN_PRESETS: EntityTypePreset[] = ["default", "legal"];

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
        await db.entityTypes.put(StoredEntityTypeSchema.parse(type));
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
     * Fills the store from the API presets the first time the app runs. Later
     * runs keep whatever the user has edited.
     *
     * @param fetchPreset - Loads one preset's types from the API.
     */
    async function seedBuiltins(
        fetchPreset: (
            preset: EntityTypePreset,
        ) => Promise<Record<string, string>>,
    ): Promise<void> {
        if ((await db.entityGroups.count()) > 0) {
            return;
        }

        for (const preset of BUILTIN_PRESETS) {
            const types = await fetchPreset(preset);

            await db.entityTypes.bulkPut(
                Object.entries(types).map(([name, description]) =>
                    StoredEntityTypeSchema.parse({
                        name,
                        description,
                        replacement: `${name.charAt(0).toUpperCase()}${name.slice(1)}-{subject}`,
                        builtin: true,
                    }),
                ),
            );

            await saveGroup({
                name: preset,
                description: "",
                labels: Object.keys(types),
                builtin: true,
            });
        }
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
        seedBuiltins,
    };
}
