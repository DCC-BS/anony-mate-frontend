import { describe, expect, it } from "vitest";
import { tidyEntitySpan } from "~/utils/detectionSpans";

function entity(text: string, start: number) {
    return {
        id: "e",
        text,
        label: "person",
        start,
        end: start + text.length,
        confidence: 0.9,
    };
}

describe("tidyEntitySpan", () => {
    it("keeps a clean detection unchanged", () => {
        expect(tidyEntitySpan(entity("Rainer", 10))).toEqual({
            id: "e",
            text: "Rainer",
            label: "person",
            start: 10,
            end: 16,
            confidence: 0.9,
        });
    });

    it("trims whitespace and table syntax off both edges", () => {
        expect(tidyEntitySpan(entity("| Rainer", 10))).toEqual({
            id: "e",
            text: "Rainer",
            label: "person",
            start: 12,
            end: 18,
            confidence: 0.9,
        });
    });

    it("trims multiple structure characters on both sides", () => {
        const result = tidyEntitySpan(entity("  | #-_ Rainer _-|  ", 10));

        expect(result).toBeDefined();
        expect(result?.text).toBe("Rainer");
        expect(result?.start).toBe(18);
        expect(result?.end).toBe(24);
    });

    it("returns undefined when nothing but structure is left", () => {
        expect(tidyEntitySpan(entity("  | -- |", 10))).toBeUndefined();
        expect(tidyEntitySpan(entity("   ", 10))).toBeUndefined();
    });

    it("drops a detection that still spans a cell or line break", () => {
        expect(tidyEntitySpan(entity("a|b", 10))).toBeUndefined();
        expect(tidyEntitySpan(entity("a\nb", 10))).toBeUndefined();
    });
});
