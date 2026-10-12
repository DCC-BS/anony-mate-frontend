import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { mockApi, PDF_ANNOTATIONS } from "./mocks";

// A scanned page whose image stream is CCITT-fax encoded: pdf.js 6.x decodes
// it through jbig2.wasm, which the worker loads from /pdfjs — the exact path
// the production CORS fix covers.
const CCITT_SCAN_PDF = readFileSync(
    join(__dirname, "./fixtures/scan-ccitt.pdf"),
);

/** Canvas pixels, sampled so the scan's bars show up where they must. */
function darkPixelShare(page: Page) {
    return () =>
        page.evaluate(() => {
            const canvas = document.querySelector<HTMLCanvasElement>(
                ".vue-pdf-embed__page canvas",
            );
            if (!canvas) {
                return -1;
            }
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return -2;
            }
            const { width, height } = canvas;
            const data = ctx.getImageData(0, 0, width, height).data;
            let dark = 0;
            let total = 0;
            for (let i = 0; i < data.length; i += 4) {
                total++;
                if (data[i] < 128) {
                    dark++;
                }
            }
            return dark / total;
        });
}

const consoleWarnings: string[] = [];

test.describe("pdf review with a CCITT-fax scan", () => {
    test("decodes the scanned page image", async ({ page }) => {
        page.on("console", (msg) => {
            if (msg.type() !== "log" && msg.type() !== "info") {
                consoleWarnings.push(`${msg.type()}: ${msg.text()}`);
            }
        });

        await mockApi(page);
        await page.route("**/api/resource/**", (route) => {
            void route.fulfill({ json: PDF_ANNOTATIONS });
        });

        await page.goto("/new");
        await expect(page.getByText("Dateien hierher ziehen")).toBeVisible();
        await page.locator('input[type="file"]').setInputFiles({
            name: "scan.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from(CCITT_SCAN_PDF),
        });
        await expect(
            page.getByText("Bereit zur Verarbeitung (1)"),
        ).toBeVisible();
        await page.getByRole("button", { name: "PDF prüfen" }).first().click();
        await expect(
            page.getByRole("button", { name: "Verarbeitung starten" }),
        ).toBeEnabled();
        await page
            .getByRole("button", { name: "Verarbeitung starten" })
            .click();
        await expect(page.getByText("Geschwärzt")).toBeVisible();
        await page.getByText("scan.pdf").click();
        await expect(
            page.locator(".vue-pdf-embed__page").first(),
        ).toBeVisible();

        // The CCITT image decodes through jbig2.wasm; the scan's bars must
        // land on the canvas. A share in the double digits is far from the
        // plain white page a failed decode leaves behind.
        await expect
            .poll(darkPixelShare(page), { timeout: 20_000 })
            .toBeGreaterThan(0.05);

        expect(
            consoleWarnings.filter((line) =>
                /jbig2|wasm|Unable to decode|Failed/i.test(line),
            ),
        ).toEqual([]);
    });
});
