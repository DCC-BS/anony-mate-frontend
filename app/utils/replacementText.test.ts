import { describe, expect, it } from "vitest";
import { replacementFor } from "~/utils/replacementText";

const detection = {
    label: "person",
    subjectIndex: 1,
    occurrenceIndex: 4,
};

describe("replacementFor", () => {
    it("uses the default template when none is given", () => {
        expect(replacementFor(detection)).toBe("person-1");
    });

    it("expands {name}, {label}, {subject} and {occurrence}", () => {
        expect(
            replacementFor(
                detection,
                "{name}|{label}|{subject}|{occurrence}",
                "Person",
            ),
        ).toBe("Person|person|1|4");
    });

    it("falls back the name to the label when a type has no display name", () => {
        expect(replacementFor(detection, "{name}", undefined)).toBe("person");
    });

    it("falls back to the default template when given an empty one", () => {
        expect(replacementFor(detection, "", "Person")).toBe("Person-1");
    });
});
