import { describe, expect, it } from "vitest";
import { slugifyLabel } from "~/utils/entityLabel";

describe("slugifyLabel", () => {
    it("lowercases and hyphenates blanks", () => {
        expect(slugifyLabel("Neue Adresse")).toBe("neue-adresse");
    });

    it("transliterates umlauts and sharp s", () => {
        expect(slugifyLabel("Größe & Typ")).toBe("groesse-typ");
        expect(slugifyLabel("Straße")).toBe("strasse");
    });

    it("keeps existing hyphens", () => {
        expect(slugifyLabel("AHV-Nummer")).toBe("ahv-nummer");
    });

    it("collapses punctuation and stray hyphens", () => {
        expect(slugifyLabel("  --Foo Bar!! ")).toBe("foo-bar");
    });

    it("strips characters outside a-z and 0-9", () => {
        expect(slugifyLabel("Café No 1")).toBe("caf-no-1");
    });

    it("comes back empty without usable characters", () => {
        expect(slugifyLabel(" *** ")).toBe("");
        expect(slugifyLabel("")).toBe("");
    });
});
