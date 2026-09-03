# AnonyMate Context

AnonyMate redacts sensitive information from free-form text. Users choose which entity types to detect and list terms that must stay visible; everything found is redacted until they say otherwise.

## Language

**Entity Type**:
A named category of sensitive information (e.g. `person`, `location`, `insurance_number`). A type has a name and a free-text description used by detectors.
_Avoid_: PII category, detector

**Preset**:
A curated set of entity types served by the backend (`default`, `legal`). Loading a preset replaces the working set.
_Avoid_: profile, template

**Detection Group**:
The set of entity types a document is detected with, chosen when it is queued and swappable afterwards from the review or the document list. Swapping one replaces every detection the document holds.
_Avoid_: schema, profile

**Custom Type**:
An entity type added by the user that is not part of any preset. Custom types can be deleted; preset types can only be toggled.
_Avoid_: user type

**Threshold**:
The minimum detection confidence for an occurrence to be reported. Fixed at 0.2 when a document is submitted — what the detector is unsure about is what a reader most needs to see. The review has its own slider that raises the floor for one document; that one never narrows what the backend is asked for, so lowering it again brings the weaker detections back.
_Avoid_: sensitivity, cutoff

**Blacklist (Never-redact list)**:
Terms exempt from redaction — they stay visible even when a detector matches them. Despite the field name `blacklist`, the semantics are an exclusion list.
_Avoid_: blocklist, allowlist, denylist

**Entity**:
A detected occurrence in the text with a span (start/end) and a confidence score, tagged with an entity type label.
_Avoid_: match, hit

**Redacted / Un-redacted**:
The two states an occurrence can be in, and the only ones. Every detection arrives **redacted** — nothing is revealed until a reader says so — and stays that way unless they un-redact it. There is no undecided state: a document is safe to hand on the moment its detections arrive.
_Avoid_: open, accepted, rejected (the three states this replaced)

**Un-redact (Remove)**:
To restore a redacted occurrence back to its original text so it stays visible in the output. A review action, not an option sent to the backend. Always reversible: an un-redacted occurrence keeps its place in the document, outlined rather than filled, and one click redacts it again.
_Avoid_: reveal, undo (undo also exists as a general editor history action)

**Review**:
The stage where a user inspects and corrects a redaction result — un-redacting occurrences, redacting words the detector missed, and changing an occurrence's entity type. Review edits are discarded when the detection runs again.
_Avoid_: post-processing, curation

**Editor / Preview**:
The two ways the review shows a document, and the two tabs it is switched with. **Editor** is the original text with every detection marked on it, and the only place decisions are made. **Preview** is the result — each redaction written as its placeholder, or as black bars — and is read-only.
_Avoid_: original, anonymised (the first names the text the editor shows, not the mode; the second was the preview's old name)
