# AnonyMate Context

AnonyMate redacts sensitive information from free-form text. Users choose which entity types to detect, set a confidence threshold, and list terms that must stay visible.

## Language

**Entity Type**:
A named category of sensitive information (e.g. `person`, `location`, `insurance_number`). A type has a name and a free-text description used by detectors.
_Avoid_: PII category, detector

**Preset**:
A curated set of entity types served by the backend (`default`, `legal`). Loading a preset replaces the working set.
_Avoid_: profile, template

**Custom Type**:
An entity type added by the user that is not part of any preset. Custom types can be deleted; preset types can only be toggled.
_Avoid_: user type

**Threshold**:
The minimum detection confidence (0–1, default 0.5) for an occurrence to be redacted. Always sent to the backend.
_Avoid_: sensitivity, cutoff

**Blacklist (Never-redact list)**:
Terms exempt from redaction — they stay visible even when a detector matches them. Despite the field name `blacklist`, the semantics are an exclusion list.
_Avoid_: blocklist, allowlist, denylist

**Entity**:
A detected occurrence in the text with a span (start/end) and a confidence score, tagged with an entity type label.
_Avoid_: match, hit

**Review**:
The stage where a user inspects and corrects a redaction result in the editor — changing an occurrence's entity type or removing a redaction. Review edits are discarded when the redaction runs again.
_Avoid_: post-processing, curation

**Un-redact (Remove)**:
To restore a redacted occurrence back to its original text so it stays visible in the output. A review action, not an option sent to the backend.
_Avoid_: reveal, undo (undo also exists as a general editor history action)
