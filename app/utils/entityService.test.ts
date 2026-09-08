import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ApiEntityPreset } from "#shared/types/redactTypes";
import { db } from "~/stores/db";
import type { StoredEntityType } from "~/types/storedEntity";
import { getEntityService } from "~/utils/entityService";

const service = getEntityService();

async function clearDb() {
    await Promise.all([
        db.entityTypes.clear(),
        db.entityGroups.clear(),
        db.blacklist.clear(),
        db.documents.clear(),
        db.detections.clear(),
    ]);
}

const preset: ApiEntityPreset = {
    person: { name: "Person", description: "A person's name" },
    ort: { name: "Ort", description: "A place" },
};

function storedType(
    name: string,
    extra: Partial<Omit<StoredEntityType, "name">> = {},
): StoredEntityType {
    return {
        name,
        displayName: "",
        description: name,
        replacement: "{name}-{subject}",
        builtin: false,
        customised: false,
        ...extra,
    };
}

beforeAll(clearDb);
beforeEach(clearDb);

describe("getEntityService", () => {
    it("syncs the built-in group from a preset on first run", async () => {
        await service.syncBuiltins(async () => preset);

        const groups = await service.getGroups();
        expect(groups.map((g) => g.name).sort()).toEqual([
            "default",
            "full",
            "legal",
        ]);
        expect(groups).toContainEqual(
            expect.objectContaining({
                name: "default",
                labels: ["person", "ort"],
                builtin: true,
            }),
        );

        const type = await db.entityTypes.get("person");
        expect(type).toEqual(
            expect.objectContaining({
                name: "person",
                displayName: "Person",
                description: "A person's name",
                builtin: true,
            }),
        );
    });

    it("refreshes a built-in description when it improves", async () => {
        await service.syncBuiltins(async () => preset);

        const api = {
            person: { name: "Person", description: "Richer wording" },
        };
        await service.syncBuiltins(async () => api);

        const type = await db.entityTypes.get("person");
        expect(type?.description).toBe("Richer wording");
    });

    it("leaves a customised built-in alone on refresh", async () => {
        await service.syncBuiltins(async () => preset);

        await db.entityTypes.put(
            storedType("person", { customised: true, description: "mine" }),
        );

        await service.syncBuiltins(async () => preset);

        const stored = await db.entityTypes.get("person");
        expect(stored?.description).toBe("mine");
        expect(stored?.customised).toBe(true);
    });

    it("drops a built-in type no preset mentions any more", async () => {
        await service.syncBuiltins(async () => preset);

        await service.syncBuiltins(async () => ({
            person: { name: "Person", description: "gone one day" },
        }));

        expect(await db.entityTypes.get("ort")).toBeUndefined();
    });

    it("keeps a custom type when a preset refresh drops a preset", async () => {
        await service.syncBuiltins(async () => preset);

        await db.entityTypes.put(storedType("ort", { description: "mine" }));

        await service.syncBuiltins(async () => ({
            person: { name: "Person", description: "only person left" },
        }));

        expect(await db.entityTypes.get("ort")).toBeDefined();
    });

    it("renames a type in every group that references it", async () => {
        await service.syncBuiltins(async () => preset);
        await service.saveGroup({
            name: "mine",
            description: "",
            labels: ["person", "ort"],
            builtin: false,
        });

        await service.renameType("person", "mensch");

        const mine = await db.entityGroups
            .filter((g) => g.name === "mine")
            .first();
        expect(mine?.labels).toEqual(["mensch", "ort"]);
        expect(await db.entityTypes.get("person")).toBeUndefined();
        expect(await db.entityTypes.get("mensch")).toBeDefined();
    });

    it("ignores renaming to a name that already exists", async () => {
        await service.saveType(storedType("a", { description: "d" }));
        await service.saveType(storedType("b", { description: "e" }));

        await service.renameType("a", "b");

        expect(await db.entityTypes.get("a")).toBeDefined();
        expect(await db.entityTypes.get("b")).toBeDefined();
    });

    it("deletes a custom type and removes it from groups", async () => {
        await service.saveType(storedType("custom", { description: "d" }));
        await service.saveGroup({
            name: "g",
            description: "",
            labels: ["custom", "person"],
            builtin: false,
        });

        await service.deleteType("custom");

        expect(await db.entityTypes.get("custom")).toBeUndefined();
        const group = await db.entityGroups
            .filter((g) => g.name === "g")
            .first();
        expect(group?.labels).toEqual(["person"]);
    });

    it("builds the name-to-description payload for a group", async () => {
        await service.saveType(storedType("person", { description: "A name" }));
        await service.saveType(storedType("ort", { description: "A place" }));
        const group = await service.saveGroup({
            name: "mine",
            description: "",
            labels: ["person", "ort"],
            builtin: false,
        });

        expect(await service.groupPayload(group.id)).toEqual({
            person: "A name",
            ort: "A place",
        });
    });

    it("adds and clears never-redact terms", async () => {
        await service.addBlacklistTerm("  Firma X  ");
        await service.addBlacklistTerm("Straße");

        const terms = await service.getBlacklist();
        expect(terms.map((t) => t.term)).toEqual(["Firma X", "Straße"]);

        await service.removeBlacklistTerm("Firma X");
        expect((await service.getBlacklist()).map((t) => t.term)).toEqual([
            "Straße",
        ]);
    });
});
