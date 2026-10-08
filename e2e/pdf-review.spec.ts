import { expect, type Page, test } from "@playwright/test";
import { ANNOTATED_PDF, BLANK_PDF, mockApi, PDF_ANNOTATIONS } from "./mocks";

/**
 * Queues a PDF for the review here and waits until its marks are ready, then
 * opens the review.
 */
async function openPdfReview(page: Page) {
    await mockApi(page);
    await page.route("**/api/resource/**", (route) => {
        void route.fulfill({ json: PDF_ANNOTATIONS });
    });

    // The file input's change listener arrives with the component's mount; a
    // file set on the input before that is silently dropped, so the page is
    // allowed to settle first.
    await page.goto("/new");
    await expect(page.getByText("Dateien hierher ziehen")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
        name: "baugesuch.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(BLANK_PDF),
    });
    // The staged count proves the file landed in the model; the start button
    // only enables once it has.
    await expect(page.getByText("Bereit zur Verarbeitung (1)")).toBeVisible();
    await page.getByRole("button", { name: "PDF prüfen" }).first().click();
    await expect(
        page.getByRole("button", { name: "Verarbeitung starten" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Verarbeitung starten" }).click();
    await expect(page.getByText("Geschwärzt")).toBeVisible();
    await page.getByText("baugesuch.pdf").click();
    await expect(page.locator(".vue-pdf-embed__page").first()).toBeVisible();
}

/** The panel the detections are decided in. */
function sidebarOf(page: Page) {
    return page
        .locator("div")
        .filter({ has: page.getByRole("heading", { name: "Erkennungen" }) })
        .first();
}

test.describe("pdf review", () => {
    test("shows the marks over the PDF and decides them in the sidebar", async ({
        page,
    }) => {
        await openPdfReview(page);

        // The page holds both marks; opening the person group rings nothing,
        // it only lists the mark's row underneath.
        const sidebar = sidebarOf(page);
        await sidebar.getByRole("button", { name: "Person 1" }).click();

        await personRowOf(page, "Schwärzung aufheben").click();
        // The row recedes and its toggle now offers the redaction again.
        await expect(personRowOf(page, "Schwärzen")).toBeVisible();
    });

    test("exports the annotated PDF with only the kept marks", async ({
        page,
    }) => {
        await openPdfReview(page);

        // Un-redact the place: it must not be in the export.
        const sidebar = sidebarOf(page);
        await sidebar.getByRole("button", { name: "Ort 1" }).click();
        await placeRowOf(page, "Schwärzung aufheben").click();
        // The row recedes and its toggle now offers the redaction again.
        await expect(placeRowOf(page, "Schwärzen")).toBeVisible();

        let annotations: {
            annotations: Array<Record<string, unknown>>;
        } | null = null;
        await page.route("**/api/annotate-pdf", (route) => {
            const body = route.request().postData() ?? "";
            const json = body.match(/name="options"\r\n\r\n(.*)\r\n/)?.[1];
            annotations = json ? JSON.parse(json) : null;
            void route.fulfill({ json: { task_id: "task-2" } });
        });
        await page.route("**/api/annotate-pdf/**", (route) => {
            void route.fulfill({
                body: ANNOTATED_PDF,
                contentType: "application/pdf",
                headers: { "X-Mark-Count": "1" },
            });
        });

        const download = page.waitForEvent("download");
        await page
            .getByRole("button", { name: "Markiertes PDF" })
            .first()
            .click();
        const file = await download;
        expect(file.suggestedFilename()).toBe("baugesuch.markiert.pdf");
        // The person mark left, the place did not: ids are the rows' own.
        const id = annotations?.annotations.at(0)?.id as string;
        expect(id).toMatch(/:person:0$/);
    });

    test("redacted marks hatch, un-redacted ones open up, and a right click opens the mark's menu", async ({
        page,
    }) => {
        await openPdfReview(page);

        // A kept redaction reads as the bar it becomes: the type's colour
        // hatching instead of a dead black area. Hatching is a background
        // *image*, the open fill is no fill at all.
        const sidebar = sidebarOf(page);
        await sidebar.getByRole("button", { name: "Ort 1" }).click();
        await placeRowOf(page, "Schwärzung aufheben").click();
        await expect(placeRowOf(page, "Schwärzen")).toBeVisible();
        // The kept ones carry their hatch, the one the reader let go is
        // now plain: the person mark hatched, the place mark open. (The
        // hatch is read from the CSSOM: an attribute matcher against the
        // style attribute misses how a headless browser serializes the
        // gradient.)
        const hatchedCount = () =>
            page.evaluate(
                () =>
                    Array.from(
                        document.querySelectorAll("[data-page] button"),
                    ).filter((button) =>
                        (button.style.backgroundImage ?? "").includes(
                            "gradient",
                        ),
                    ).length,
            );
        await expect.poll(hatchedCount).toBe(1);
        const plain = page
            .locator('[data-page] button[aria-label*="«Berlin»"]')
            .first();

        // The mark's own menu opens on right click at its box and offers
        // only the moves its state has: an un-redacted mark is taken back
        // (this one or all of its text), a redacted one would offer the
        // reverse pair; either way, relabel and the removal.
        await plain.click({ button: "right" });
        const menu = page.getByRole("menuitem");
        await expect(menu).toHaveCount(4);
        await expect(menu.getByText("Entität ändern")).toBeVisible();
        await expect(
            menu.getByText("Schwärzen", { exact: true }),
        ).toBeVisible();
        await expect(menu.getByText("Alle Vorkommen schwärzen")).toBeVisible();
        await expect(menu.getByText("Erkennung löschen")).toBeVisible();

        // Taking it back through the menu: the row reads redacted again.
        await page
            .getByRole("menuitem", { name: "Schwärzen", exact: true })
            .click();
        await expect(placeRowOf(page, "Schwärzung aufheben")).toBeVisible();
    });

    test("a right click on a kept mark offers the un-redact pair", async ({
        page,
    }) => {
        await openPdfReview(page);

        // Everything arrives redacted; a right click on a kept mark offers
        // the move that opens it up, on the mark and on its occurrences.
        const mark = page
            .locator('[data-page] button[aria-label*="«Max Mustermann»"]')
            .first();
        await mark.click({ button: "right", force: true });
        const menu = page.getByRole("menuitem");
        await expect(menu).toHaveCount(4);
        await expect(
            menu.getByText("Schwärzung aufheben", { exact: true }),
        ).toBeVisible();
        await expect(menu.getByText("Alle Vorkommen aufheben")).toBeVisible();
        await expect(menu.getByText("Entität ändern")).toBeVisible();
        await expect(menu.getByText("Erkennung löschen")).toBeVisible();
    });

    test("a left click on a mark rings and reveals its sidebar row", async ({
        page,
    }) => {
        await openPdfReview(page);

        // The group starts closed; the click on the mark opens it and
        // the row names itself into view.
        const ortMark = page
            .locator('[data-page] button[aria-label*="«Berlin»"]')
            .first();
        await ortMark.click();
        const sidebar = sidebarOf(page);
        await expect(
            sidebar.getByRole("button", { name: "Ort 1" }),
        ).toHaveAttribute("aria-expanded", "true");
        // The row is on screen: the reveal scrolled it to the middle.
        const placeRow = sidebarOf(page)
            .locator("div[data-detection]")
            .filter({ has: page.getByRole("button", { name: /Berlin/ }) })
            .first();
        await expect(placeRow).toBeInViewport({ ratio: 0.5 });
    });
});

/** The row of one detection, named by the text it covers. */
function personRowOf(page: Page, action: string) {
    const row = sidebarOf(page)
        .getByRole("button", { name: /Max Mustermann/ })
        .locator("xpath=..");
    return row.getByRole("button", { name: action });
}

function placeRowOf(page: Page, action: string) {
    const row = sidebarOf(page)
        .getByRole("button", { name: /Berlin/ })
        .locator("xpath=..");
    return row.getByRole("button", { name: action });
}
