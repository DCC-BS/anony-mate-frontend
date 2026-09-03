import { Dexie, type EntityTable } from "dexie";
import {
    addDisplayNames,
    numberExistingDetections,
    redactByDefault,
    renameLabelsToGerman,
} from "~/stores/dbUpgrades";
import type { StoredDetection, StoredDocument } from "~/types/storedDocument";
import type {
    StoredBlacklistTerm,
    StoredEntityGroup,
    StoredEntityType,
} from "~/types/storedEntity";

/**
 * Browser-side store for documents and their detections.
 *
 * The API keeps no state: everything needed to show progress, or to resume
 * after a reload, is held here.
 */
export const db = new Dexie("anonymate-db") as Dexie & {
    documents: EntityTable<StoredDocument, "id">;
    detections: EntityTable<StoredDetection, "id">;
    entityTypes: EntityTable<StoredEntityType, "name">;
    entityGroups: EntityTable<StoredEntityGroup, "id">;
    blacklist: EntityTable<StoredBlacklistTerm, "term">;
};

/**
 * The tables and their indexes.
 *
 * Every version since the second declares the same shape: Dexie needs the whole
 * schema on each one, and repeating it by hand is how a version ends up quietly
 * missing an index. What each version actually changes is its upgrade.
 */
const SCHEMA = {
    documents: "id, status, name, createdAt, updatedAt",
    detections: "id, documentId, label, state",
    entityTypes: "name, builtin",
    entityGroups: "id, name, builtin",
    blacklist: "term, createdAt",
};

db.version(1).stores({
    documents: SCHEMA.documents,
    detections: SCHEMA.detections,
});

db.version(2).stores(SCHEMA);

db.version(3).stores(SCHEMA).upgrade(numberExistingDetections);

db.version(4).stores(SCHEMA).upgrade(renameLabelsToGerman);

db.version(5).stores(SCHEMA).upgrade(addDisplayNames);

db.version(6).stores(SCHEMA).upgrade(redactByDefault);
