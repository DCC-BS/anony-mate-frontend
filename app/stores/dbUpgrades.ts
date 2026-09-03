import type { Transaction } from "dexie";
import type { StoredDetection } from "~/types/storedDocument";

/**
 * English preset labels and the German ones that replaced them.
 *
 * The detection model reads the label name as well as its description, and on
 * German documents a German name measurably beats an English one. Renaming the
 * presets would otherwise leave documents reviewed before the change speaking a
 * different vocabulary than the ones after it.
 */
const GERMAN_LABELS: Record<string, string> = {
    location: "ort",
    organization: "organisation",
    address: "adresse",
    date: "datum",
    birth_date: "geburtsdatum",
    money: "geldbetrag",
    phone_number: "telefonnummer",
    email: "e-mail-adresse",
    social_insurance_number: "ahv-nummer",
    case_number: "aktenzeichen",
    service_identifier: "dienstkennung",
    serial_number: "seriennummer",
    ip_address: "ip-adresse",
    mac_address: "mac-adresse",
    licence_plate: "kfz-kennzeichen",
    id_document_number: "ausweisnummer",
    insurance_number: "versichertennummer",
    patient_number: "patientennummer",
    company_id_number: "uid-nummer",
    job_title: "beruf",
    nationality: "nationalitaet",
    health_information: "gesundheitsangabe",
    username: "benutzername",
};

/**
 * Numbers detections by occurrence and by distinct value, and gives every
 * entity type a replacement template.
 *
 * The existing detections are numbered the same way a fresh result is, per
 * document and label.
 */
export async function numberExistingDetections(tx: Transaction): Promise<void> {
    // Detections gained occurrenceIndex/subjectIndex; number the existing
    // ones the same way new results are numbered, per document and label.
    const detections = await tx.table("detections").toArray();
    const byDocumentAndLabel = new Map<string, StoredDetection[]>();

    for (const detection of detections) {
        const key = `${detection.documentId}:${detection.label}`;
        byDocumentAndLabel.set(key, [
            ...(byDocumentAndLabel.get(key) ?? []),
            detection,
        ]);
    }

    const renumbered = [...byDocumentAndLabel.values()].flatMap((group) => {
        const subjectNumbers = new Map<string, number>();

        return [...group]
            .sort((a, b) => a.start - b.start)
            .map((detection, index) => {
                const value = detection.text.trim().toLowerCase();
                if (!subjectNumbers.has(value)) {
                    subjectNumbers.set(value, subjectNumbers.size + 1);
                }

                return {
                    ...detection,
                    occurrenceIndex: index + 1,
                    subjectIndex: subjectNumbers.get(value) as number,
                };
            });
    });

    await tx.table("detections").bulkPut(renumbered);

    // Entity types gained a replacement template.
    await tx
        .table("entityTypes")
        .toCollection()
        .modify((type) => {
            if (!type.replacement) {
                const name = String(type.name);
                type.replacement = `${name.charAt(0).toUpperCase()}${name.slice(1)}-{subject}`;
            }
        });
}

/**
 * Moves the presets to their German labels.
 *
 * A renamed type is the same type, so the user's own wording and replacement
 * template come with it. Types they added themselves are not in the map and
 * are left alone.
 */
export async function renameLabelsToGerman(tx: Transaction): Promise<void> {
    await tx
        .table("detections")
        .toCollection()
        .modify((detection) => {
            const german = GERMAN_LABELS[String(detection.label)];
            if (german) {
                detection.label = german;
            }
        });

    // A renamed type is the same type, so the user's own wording and
    // replacement template come with it. Types they added themselves are
    // not in the map and are left alone.
    const types = await tx.table("entityTypes").toArray();
    for (const type of types) {
        const german = GERMAN_LABELS[String(type.name)];
        if (!german) {
            continue;
        }

        await tx.table("entityTypes").delete(type.name);
        if (!(await tx.table("entityTypes").get(german))) {
            await tx.table("entityTypes").put({
                ...type,
                name: german,
                replacement: `${german.charAt(0).toUpperCase()}${german.slice(1)}-{subject}`,
            });
        }
    }

    await tx
        .table("entityGroups")
        .toCollection()
        .modify((group) => {
            group.labels = (group.labels ?? []).map(
                (label: string) => GERMAN_LABELS[label] ?? label,
            );
        });
}

/**
 * Gives every type the name it is shown under.
 *
 * Built-ins get theirs from the API on the next run; a type the user owns keeps
 * its own wording, so its label stands in as the name.
 */
export async function addDisplayNames(tx: Transaction): Promise<void> {
    // A type now carries the name it is shown under, and writes its
    // replacement from that name rather than spelling it out. Built-ins
    // get theirs from the API on the next run; a type the user owns keeps
    // its own wording, so its label stands in as the name.
    await tx
        .table("entityTypes")
        .toCollection()
        .modify((type) => {
            type.displayName ??= "";

            if (type.builtin && !type.customised) {
                type.replacement = "{name}-{subject}";
            }
        });
}

/**
 * Collapses the review's three states into two.
 *
 * It used to be open, accepted and rejected, with new detections arriving
 * undecided and staying in the document until someone accepted them. It is now
 * redacted and unredacted, and it starts from the safe one.
 *
 * An undecided detection was visible but meant to be looked at, so it becomes
 * redacted rather than un-redacted: that is the state a reader would have
 * reached by accepting it, and it errs towards hiding rather than revealing.
 */
export async function redactByDefault(tx: Transaction): Promise<void> {
    await tx
        .table("detections")
        .toCollection()
        .modify((detection) => {
            detection.state =
                detection.state === "rejected" ? "unredacted" : "redacted";
        });

    // A document now remembers which group it was detected with, so the
    // review can swap it. Documents from before have no record of one.
    await tx
        .table("documents")
        .toCollection()
        .modify((document) => {
            document.entityGroupId ??= "";
            document.entityGroupName ??= "";
        });
}
