import { describe, expect, it } from "vitest";
import { REDACTION_STYLES } from "~/utils/redactionStyles";

describe("REDACTION_STYLES", () => {
    it("offers the placeholder first and the black bars second", () => {
        expect(REDACTION_STYLES.map((style) => style.key)).toEqual([
            "placeholder",
            "blacked",
        ]);
        expect(REDACTION_STYLES.map((style) => style.blacked)).toEqual([
            false,
            true,
        ]);
    });
});
