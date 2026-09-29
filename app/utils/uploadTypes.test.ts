import { describe, expect, it } from "vitest";
import { isPdf, markedPdfName } from "./uploadTypes";

describe("isPdf", () => {
    it("takes the browser's type", () => {
        expect(isPdf(new File([""], "scan", { type: "application/pdf" }))).toBe(
            true,
        );
    });

    it("falls back to the name when the browser gives no type", () => {
        expect(isPdf(new File([""], "Bericht.PDF"))).toBe(true);
    });

    it("refuses anything else", () => {
        expect(
            isPdf(new File([""], "brief.docx", { type: "application/msword" })),
        ).toBe(false);
    });
});

describe("markedPdfName", () => {
    it("marks the name before its extension", () => {
        expect(markedPdfName("baugesuch.pdf")).toBe("baugesuch.markiert.pdf");
    });

    it("adds the extension to a name without one", () => {
        expect(markedPdfName("baugesuch")).toBe("baugesuch.markiert.pdf");
    });
});
