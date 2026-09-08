import { describe, expect, it } from "vitest";
import { openTableHeader, restoreTableHeader } from "~/utils/pageMarkdown";

describe("openTableHeader", () => {
    it("returns the last open table's header", () => {
        const before = "intro\n| h | b |\n| --- | --- |\n| 1 | 2 |";
        expect(openTableHeader(before)).toBe("| h | b |\n| --- | --- |");
    });

    it("returns undefined when no table is left open", () => {
        expect(openTableHeader("just prose")).toBeUndefined();
        expect(openTableHeader("| --- |")).toBeUndefined();
    });
});

describe("restoreTableHeader", () => {
    it("prefixes a continued table with its header", () => {
        expect(
            restoreTableHeader("| b |\n| --- |\n| 1 |", "| h |\n| --- |"),
        ).toBe("| h |\n| --- |\n| b |\n| 1 |");
    });

    it("drops a repeated delimiter left over by docling", () => {
        expect(
            restoreTableHeader("| a |\n| --- |\n| 1 |", "| h |\n| --- |"),
        ).toBe("| h |\n| --- |\n| a |\n| 1 |");
    });

    it("returns the page unchanged without a header", () => {
        expect(restoreTableHeader("| a |", undefined)).toBe("| a |");
        expect(restoreTableHeader("plain", "| h |\n| --- |")).toBe("plain");
    });
});
