import { expect, test } from "@playwright/test";
import { mockApi } from "./mocks";

/**
 * Queues a pasted document and waits until it is ready, then opens its review.
 */
async function openReview(page: import("@playwright/test").Page) {
    await mockApi(page);
    await page.goto("/new");
    await page.getByRole("tab", { name: "Text einfügen" }).click();
    await page
        .getByPlaceholder(
            "Text hier einfügen – z. B. eine Aktennotiz oder ein Protokollausschnitt.",
        )
        .fill("Max Mustermann wohnt in Berlin.");
    await page.getByRole("button", { name: "Verarbeitung starten" }).click();

    await expect(page.getByText("Geschwärzt")).toBeVisible();
    await page.getByText("Eingefügter Text").click();
    await expect(page.locator(".detection-mark")).toHaveCount(2);
}

test.describe("review", () => {
    test("un-redacts a detection and redacts it again", async ({ page }) => {
        await openReview(page);

        // Everything starts redacted.
        await expect(page.getByText("2 geschwärzt")).toBeVisible();

        // Expand the person group to reveal its detection row.
        await page.getByRole("button", { name: /^Person/ }).click();

        // The sidebar holds the detection rows; the person row is the one that
        // names the detection, and its toggle sits beside it.
        const sidebar = page
            .locator("div")
            .filter({ has: page.getByRole("heading", { name: "Erkennungen" }) })
            .first();
        const personRow = sidebar
            .getByRole("button", { name: /Max Mustermann/ })
            .locator("xpath=..");
        await personRow
            .getByRole("button", { name: "Schwärzung aufheben" })
            .click();

        // The stats move: one un-redacted, one redacted.
        await expect(page.getByText("1 nicht geschwärzt")).toBeVisible();
        await expect(page.getByText("1 geschwärzt")).toBeVisible();

        // Redact it again; the row's toggle now reads "Schwärzen".
        await personRow.getByRole("button", { name: "Schwärzen" }).click();
        await expect(page.getByText("2 geschwärzt")).toBeVisible();
    });

    test("switches to the preview and shows placeholders", async ({ page }) => {
        await openReview(page);

        await page.getByRole("tab", { name: "Vorschau" }).click();

        // The preview writes each redaction as its placeholder.
        await expect(page.getByText("Person-1")).toBeVisible();
        await expect(page.getByText("Ort-1")).toBeVisible();
    });

    test("walks the review wizard", async ({ page }) => {
        await openReview(page);

        await page.getByRole("button", { name: "Prüfassistent" }).click();

        // The wizard walks the redactions one at a time.
        await expect(page.getByText("Prüfassistent")).toBeVisible();
        await expect(page.getByText("0 von 2 geprüft")).toBeVisible();

        // Keep the first redaction.
        await page.getByRole("button", { name: "Geschwärzt lassen" }).click();
        await expect(page.getByText("1 von 2 geprüft")).toBeVisible();

        // Un-redact the second.
        await page.getByRole("button", { name: "Schwärzung aufheben" }).click();
        await expect(page.getByText("2 von 2 geprüft")).toBeVisible();
        await expect(page.getByText("Alle Erkennungen geprüft")).toBeVisible();
    });
});
