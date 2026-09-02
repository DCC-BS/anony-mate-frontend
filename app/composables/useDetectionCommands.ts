import { db } from "~/stores/db";
import { Cmds, EditDetectionsCommand } from "~/types/commands";
import type { StoredDetection } from "~/types/storedDocument";

/**
 * Applies detection edits, and lets them be taken back.
 *
 * Every edit runs through the command bus so the history from
 * `@dcc-bs/event-system.bs.js` can reverse it. The caller says what the rows
 * were and what they should become; working out the difference, writing it and
 * renumbering afterwards happens here.
 *
 * @param documentId - Document whose detections are being edited.
 */
export function useDetectionCommands(documentId: MaybeRefOrGetter<string>) {
    const { executeCommand, onCommand } = useCommandBus();

    onCommand<EditDetectionsCommand>(Cmds.EditDetections, async (command) => {
        const keep = new Set(command.after.map((row) => row.id));
        const gone = command.before
            .map((row) => row.id)
            .filter((id) => !keep.has(id));

        await db.transaction("rw", db.detections, async () => {
            await db.detections.bulkDelete(gone);
            await db.detections.bulkPut(command.after.map(plain));
        });

        for (const label of command.labels) {
            await renumber(command.documentId, label);
        }
    });

    /** Records an edit, and puts it on the history so it can be undone. */
    function edit(before: StoredDetection[], after: StoredDetection[]) {
        return executeCommand(
            new EditDetectionsCommand(toValue(documentId), before, after),
        );
    }

    return { edit };
}

/**
 * A row as IndexedDB can store it.
 *
 * A command that has been through the history comes back wrapped in Vue's deep
 * reactivity, and a proxy cannot be structured-cloned. Copying the row drops
 * the wrapper, so undo and redo write the same plain rows the first edit did.
 */
function plain(detection: StoredDetection): StoredDetection {
    return { ...toRaw(detection) };
}

/**
 * Renumbers one label's detections in document order.
 *
 * A detection's number is its place among its kind, so it is derived from the
 * whole set rather than stored when the row is written.
 */
async function renumber(documentId: string, label: string): Promise<void> {
    const rows = await db.detections
        .where("documentId")
        .equals(documentId)
        .and((detection) => detection.label === label)
        .toArray();

    // numberEntities sorts by position and returns whole rows, so its result
    // is what goes back — pairing it with the unsorted read by index would
    // write each row's numbers onto a different row.
    await db.detections.bulkPut(numberEntities(rows) as StoredDetection[]);
}
