import type { ICommand, IReversibleCommand } from "#build/types/commands";
import type { StoredDetection } from "~/types/storedDocument";

export const Cmds = {
    EditDetections: "EditDetectionsCommand",
} as const;

/**
 * One edit to a document's detections, expressed as the rows before and after.
 *
 * Every change the review makes is of this shape — deciding, relabelling and
 * marking all come down to rows that were and rows that are — so one command
 * carries them all and its inverse is the same command with the two swapped.
 * A row present in `before` but not in `after` was removed, and the other way
 * round it was added.
 */
export class EditDetectionsCommand implements IReversibleCommand {
    readonly $type = Cmds.EditDetections;
    readonly $undoCommand: ICommand;

    constructor(
        public readonly documentId: string,
        public readonly before: StoredDetection[],
        public readonly after: StoredDetection[],
        undoCommand?: ICommand,
    ) {
        // Built here rather than on undo so the pair points at each other and
        // a command can be redone as many times as it is undone.
        this.$undoCommand =
            undoCommand ??
            new EditDetectionsCommand(documentId, after, before, this);
    }

    /** Entity types this edit touched, whose numbering has to be redone. */
    get labels(): string[] {
        return [
            ...new Set([...this.before, ...this.after].map((row) => row.label)),
        ];
    }

    toString(): string {
        return `Edit ${this.after.length || this.before.length} detection(s)`;
    }
}
