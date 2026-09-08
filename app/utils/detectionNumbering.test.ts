import { describe, expect, it } from "vitest";
import type { Entity } from "#shared/types/redactTypes";
import { numberEntities } from "~/utils/detectionNumbering";

function entity(text: string, start: number, label = "person"): Entity {
    return {
        id: `${label}-${start}`,
        text,
        label,
        start,
        end: start + text.length,
        confidence: 0.9,
    };
}

describe("numberEntities", () => {
    it("returns detections in document order", () => {
        const result = numberEntities([
            entity("Rainer", 30),
            entity("Anna", 5),
        ]);

        expect(result.map((e) => e.text)).toEqual(["Anna", "Rainer"]);
    });

    it("numbers each occurrence and each distinct value", () => {
        const result = numberEntities([
            entity("Max", 0),
            entity("Max", 20),
            entity("Moritz", 40),
        ]);

        expect(result.map((e) => e.occurrenceIndex)).toEqual([1, 2, 3]);
        expect(result.map((e) => e.subjectIndex)).toEqual([1, 1, 2]);
    });

    it("treats repeated text as one subject regardless of case and spacing", () => {
        const result = numberEntities([
            entity("Max", 0),
            entity("max", 10),
            entity(" Max ", 20),
        ]);

        expect(result.map((e) => e.subjectIndex)).toEqual([1, 1, 1]);
    });

    it("numbers subjects per label, not across labels", () => {
        const result = numberEntities([
            entity("Max", 0, "person"),
            entity("Max", 10, "location"),
        ]);

        expect(result.map((e) => e.subjectIndex)).toEqual([1, 1]);
    });
});
