# 0001 Blacklist keeps its exclusion semantics

The `blacklist` option in `RedactOptionsSchema` has exclusion semantics — listed terms are never redacted — yet keeps the wire field name `blacklist`, which reads like a force-redaction list. The UI therefore labels it "Never redact" while sending the field unchanged. Renaming the field (e.g. to `never_redact`) was considered but would require a mapping layer on the Nitro proxy for no functional gain, so the backend's field name is preserved and the semantics are documented in CONTEXT.md.
