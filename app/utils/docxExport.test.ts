import { convertMarkdownToDocx } from "@mohtasham/md-to-docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

/** Same marker useDocumentExport joins pages with. */
const DOCX_PAGE_BREAK = "\n\n<!-- pagebreak -->\n\n";

async function documentXml(markdown: string): Promise<string> {
    const blob = await convertMarkdownToDocx(markdown);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) {
        throw new Error("word/document.xml missing from the exported docx");
    }
    return xml;
}

describe("Word export (md-to-docx)", () => {
    it("turns the page marker into one Word page break per page boundary", async () => {
        const xml = await documentXml(
            ["# Seite 1", "Zweite Seite", "Dritte Seite"].join(DOCX_PAGE_BREAK),
        );

        expect(xml.match(/<w:br w:type="page"\/>/g) ?? []).toHaveLength(2);
        expect(xml).not.toContain("pagebreak");
    });

    it("keeps redacted text and placeholders", async () => {
        const xml = await documentXml(
            "Herr ████ wohnt in [Ort-1].\n\nTelefon: Telefonnummer-1",
        );

        expect(xml).toContain("████");
        expect(xml).toContain("Ort-1");
        expect(xml).toContain("Telefonnummer-1");
    });

    it("renders markdown tables as Word tables", async () => {
        const xml = await documentXml(
            "| Name | Ort |\n| --- | --- |\n| Person-1 | Ort-1 |",
        );

        expect(xml).toContain("<w:tbl>");
        expect(xml).toContain("Person-1");
    });
});
