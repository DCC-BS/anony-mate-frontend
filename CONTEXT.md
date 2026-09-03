# AnonyMate Context

AnonyMate redacts sensitive information from free-form text. Users choose which entity types to detect and list terms that must stay visible; everything found is redacted until they say otherwise.

## Language

**Entity Type**:
A named category of sensitive information (e.g. `person`, `location`, `insurance_number`). A type has a name and a free-text description used by detectors.
_Avoid_: PII category, detector

**Label**:
The technical name of an entity type, as sent to the API and read by the detection model (e.g. `ahv-nummer`). Distinct from the display name a reader sees.
_Avoid_: name (the display name), key

**Display Name**:
What an entity type is called in the interface and in its replacement (e.g. `AHV-Nummer` for the label `ahv-nummer`). Falls back to the label where a type has none.
_Avoid_: title, caption

**Preset**:
A curated set of entity types served by the backend (`default`, `legal`, `full`). Presets are seeded into IndexedDB as the built-in groups on first run and refreshed from the API on every run.
_Avoid_: profile, template

**Detection Group**:
A named set of entity types a document is detected with, chosen when it is queued and swappable afterwards from the review or the document list. Swapping one replaces every detection the document holds. The built-in groups are the presets; a user wanting their own selection copies a preset into a group of their own.
_Avoid_: schema, profile

**Custom Type**:
An entity type added by the user that is not part of any preset. Custom types can be deleted; preset types can be edited but not deleted.
_Avoid_: user type

**Customised**:
A built-in type the user has edited. Editing a built-in makes it the user's: the preset refresh leaves it alone from here on, so an improved description from the API no longer overwrites the user's own wording.
_Avoid_: edited, owned

**Threshold**:
The minimum detection confidence for an occurrence to be reported. Fixed at 0.2 when a document is submitted — what the detector is unsure about is what a reader most needs to see. The review has its own slider that raises the floor for one document; that one never narrows what the backend is asked for, so lowering it again brings the weaker detections back.
_Avoid_: sensitivity, cutoff

**Blacklist (Never-redact list)**:
Terms exempt from redaction — they stay visible even when a detector matches them. Despite the field name `blacklist`, the semantics are an exclusion list.
_Avoid_: blocklist, allowlist, denylist

**Entity**:
A detected occurrence in the text with a span (start/end) and a confidence score, tagged with an entity type label.
_Avoid_: match, hit

**Occurrence**:
One mention of a detected value in the text. Every mention of the same text is a separate occurrence but shares a subject number, so one person keeps one number throughout the document.
_Avoid_: match, hit

**Subject**:
A distinct detected value within an entity type. Every mention of the same text shares a subject number, so one person keeps one number throughout the document. Distinct from the occurrence number, which counts every mention.
_Avoid_: value, entity

**Replacement**:
The template an entity type's redactions are written from, e.g. `{name}-{subject}`. Supports `{name}`, `{label}`, `{subject}` (same value keeps its number) and `{occurrence}`.
_Avoid_: placeholder text, template (reserved for the preset sense)

**Redacted / Un-redacted**:
The two states an occurrence can be in, and the only ones. Every detection arrives **redacted** — nothing is revealed until a reader says so — and stays that way unless they un-redact it. There is no undecided state: a document is safe to hand on the moment its detections arrive.
_Avoid_: open, accepted, rejected (the three states this replaced)

**Un-redact (Remove)**:
To restore a redacted occurrence back to its original text so it stays visible in the output. A review action, not an option sent to the backend. Always reversible: an un-redacted occurrence keeps its place in the document, outlined rather than filled, and one click redacts it again.
_Avoid_: reveal, undo (undo also exists as a general editor history action)

**Marking**:
The review mode where a reader selects words in the editor and files them as a detection of a chosen entity type. A mark arrives redacted at once; clicking an existing detection in marking mode erases it.
_Avoid_: annotating, highlighting

**Relabel**:
To move a detection to a different entity type, keeping its decision. The detection's id carries the label, so a relabelled detection is a new row and the old one goes away with it.
_Avoid_: re-categorise, change type

**Remove Detection**:
To take a detection out of the document for good, saying the mention is not sensitive at all. Distinct from un-redacting, which only restores the words. Still reversible through the command history.
_Avoid_: delete, drop

**Redaction Style**:
How a redaction is written into the result: as the entity type's **placeholder** (e.g. `Person-1`) or as **black bars** (`████`). A property of the result, not a view of its own; the document underneath is the same either way.
_Avoid_: format, rendering

**Re-detect**:
To run detection on a document again with another detection group. The conversion is not repeated; what comes back replaces the detections wholesale, so every decision the reader had recorded is gone with them.
_Avoid_: recompute, re-run, re-analyse

**Review Wizard**:
The step-through assistant that walks the redactions one at a time, asking whether each has to be taken out. Everything starts redacted, so it walks the redactions rather than a queue of undecided findings.
_Avoid_: assistant, walkthrough

**Review**:
The stage where a user inspects and corrects a redaction result — un-redacting occurrences, redacting words the detector missed, and changing an occurrence's entity type. Review edits are discarded when the detection runs again.
_Avoid_: post-processing, curation

**Editor / Preview**:
The two ways the review shows a document, and the two tabs it is switched with. **Editor** is the original text with every detection marked on it, and the only place decisions are made. **Preview** is the result — each redaction written as its placeholder, or as black bars — and is read-only.
_Avoid_: original, anonymised (the first names the text the editor shows, not the mode; the second was the preview's old name)

**Document Status**:
Where a document stands in the client-owned pipeline: `staged` (queued, nothing sent yet), `converting` (uploaded file is at docling), `redacting` (text is at the redact endpoint), `ready` (detections stored, waiting for review), or `failed`. The API is stateless, so this status is the only record of progress and it lives in IndexedDB.
_Avoid_: state, phase

**Queue**:
The browser-owned pipeline that works staged documents off one at a time through conversion and redaction. The API holds no task state, so a reload re-reads IndexedDB and picks up whatever is unfinished.
_Avoid_: pipeline, worker
