import { expect, test } from "@playwright/test";
import { mockApi } from "./mocks";

test.describe("document queue", () => {
    test("queues pasted text, processes it, and opens the review", async ({
        page,
    }) => {
        await mockApi(page);
        await page.goto("/documents");

        // Empty state before anything is queued.
        await expect(
            page.getByText("Noch keine Dokumente vorhanden."),
        ).toBeVisible();

        // Start a new document from pasted text, via the workspace nav.
        await page
            .getByRole("navigation")
            .getByRole("link", { name: "Neu anonymisieren" })
            .click();
        await page.getByRole("tab", { name: "Text einfügen" }).click();
        await page
            .getByPlaceholder(
                "Text hier einfügen, z. B. eine Aktennotiz oder einen Protokollausschnitt.",
            )
            .fill("Max Mustermann wohnt in Berlin.");
        await page
            .getByRole("button", { name: "Verarbeitung starten" })
            .click();

        // Back on the overview, the queue runs the document to ready.
        await expect(page.getByText("Eingefügter Text")).toBeVisible();
        await expect(page.getByText("Geschwärzt")).toBeVisible();
        await expect(page.getByText("2", { exact: true })).toBeVisible();

        // Open the review: both detections are marked in the editor.
        await page.getByText("Eingefügter Text").click();
        await expect(page.getByText("Max Mustermann")).toBeVisible();
        await expect(page.getByText("Berlin")).toBeVisible();
        await expect(page.locator(".detection-mark")).toHaveCount(2);
    });

    test("marks a PDF for redaction and offers it to download", async ({
        page,
    }) => {
        await mockApi(page);
        let options: Record<string, unknown> = {};
        await page.route("**/api/redact-document", (route) => {
            const body = route.request().postData() ?? "";
            const json = body.match(/name="options"\r\n\r\n(.*)\r\n/)?.[1];
            options = json ? JSON.parse(json) : {};
            void route.fulfill({ json: { task_id: "task-1" } });
        });

        await page.goto("/new");
        await page.locator('input[type="file"]').setInputFiles({
            name: "baugesuch.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-1.7\n%%EOF\n"),
        });
        await page
            .getByRole("switch", { name: "PDF mit Schwärzungsmarkierungen" })
            .click();
        await page
            .getByRole("button", { name: "Verarbeitung starten" })
            .click();

        // The document is not reviewed here: it is offered to download.
        await expect(page.getByText("PDF markiert")).toBeVisible();
        await expect(page.getByText("3", { exact: true })).toBeVisible();
        expect(options).toMatchObject({ marked_pdf: true });

        const download = page.waitForEvent("download");
        await page.getByTitle("Markiertes PDF herunterladen").click();
        expect((await download).suggestedFilename()).toBe(
            "baugesuch.markiert.pdf",
        );
    });

    test("shows a failed document and lets it be retried", async ({ page }) => {
        await mockApi(page);
        // The redact submission fails, so the document lands on failed.
        await page.route("**/api/redact", (route) =>
            route.fulfill({ status: 500, body: "boom" }),
        );

        await page.goto("/new");
        await page.getByRole("tab", { name: "Text einfügen" }).click();
        await page
            .getByPlaceholder(
                "Text hier einfügen, z. B. eine Aktennotiz oder einen Protokollausschnitt.",
            )
            .fill("Max Mustermann wohnt in Berlin.");
        await page
            .getByRole("button", { name: "Verarbeitung starten" })
            .click();

        await expect(page.getByText("Fehlgeschlagen").first()).toBeVisible();
        await expect(page.getByTitle("Erneut versuchen")).toBeVisible();
    });
});
