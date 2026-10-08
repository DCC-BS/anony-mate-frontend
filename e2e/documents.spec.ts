import { expect, test } from "@playwright/test";
import { BLANK_PDF, mockApi, PDF_ANNOTATIONS } from "./mocks";

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

    test("scans a PDF for the review and shows its marks", async ({ page }) => {
        await mockApi(page);
        let options: Record<string, unknown> = {};
        await page.route("**/api/redact-document", (route) => {
            const body = route.request().postData() ?? "";
            const json = body.match(/name="options"\r\n\r\n(.*)\r\n/)?.[1];
            options = json ? JSON.parse(json) : {};
            void route.fulfill({ json: { task_id: "task-1" } });
        });
        await page.route("**/api/task/**", (route) => {
            void route.fulfill({
                json: {
                    task_id: "task-1",
                    status: "finished",
                    resource_id: "resource-1",
                },
            });
        });
        await page.route("**/api/resource/**", (route) => {
            void route.fulfill({ json: PDF_ANNOTATIONS });
        });

        // The file input's change listener arrives with the component's
        // mount; a file set on the input before that is silently dropped.
        await page.goto("/new");
        await expect(page.getByText("Dateien hierher ziehen")).toBeVisible();
        await page.locator('input[type="file"]').setInputFiles({
            name: "baugesuch.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from(BLANK_PDF),
        });
        await expect(
            page.getByText("Bereit zur Verarbeitung (1)"),
        ).toBeVisible();
        // The output is a choice, and the PDF review is what was wanted.
        await page.getByRole("button", { name: "PDF prüfen" }).first().click();
        await expect(
            page.getByRole("button", { name: "Verarbeitung starten" }),
        ).toBeEnabled();
        await page
            .getByRole("button", { name: "Verarbeitung starten" })
            .click();

        // The PDF is reviewed here, so the row opens its review.
        await expect(page.getByText("Geschwärzt")).toBeVisible();
        await expect(page.getByText("2", { exact: true })).toBeVisible();
        expect(options).toMatchObject({
            pdf_annotations: true,
            blacklist: [],
        });

        await page.getByText("baugesuch.pdf").click();
        await expect(
            page.locator(".vue-pdf-embed__page").first(),
        ).toBeVisible();
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
