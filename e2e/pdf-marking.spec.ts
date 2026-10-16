import { expect, type Page, test } from "@playwright/test";
import { BLANK_PDF, mockApi, PDF_ANNOTATIONS } from "./mocks";

/** A minimal two-page PDF, page 2 carrying one line of text, with xref. */
function twoPagePdf(): Buffer {
    // Sits under the test's drag region on page 2: one text object, so the
    // text layer carries the whole sentence in one span, and the rectangle
    // drawn over only one word must guess just that word.
    const stream =
        "BT /F1 24 Tf 180 592 Td (Streng Geheimdaten und Vertrauliches) Tj ET";
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 6 0 R >> >> /Contents 5 0 R >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let body = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (const [index, object] of objects.entries()) {
        offsets.push(body.length);
        body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    }
    const xrefStart = body.length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
        xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }
    body += `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(body, "latin1");
}

const EMPTY_MARKS = {
    annotations: [],
    page_sizes: { 1: [595, 842], 2: [595, 842] },
};

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

/** A kept redaction reads as a hatch: a background *image*, not a colour. */
function hatchedMarkCount(page: Page) {
    return page.evaluate(
        () =>
            Array.from(document.querySelectorAll("[data-page] button")).filter(
                (button) =>
                    (button.style.backgroundImage ?? "").includes("gradient"),
            ).length,
    );
}

test.describe("pdf marking", () => {
    test("a drawn rectangle files a redacted mark, and erasing and undo take it back and forth", async ({
        page,
    }) => {
        await openPdfReview(page);

        // The marker goes into the hand from the header; the first entity
        // type is preselected, so the rectangle lands under "person".
        await page.getByRole("button", { name: "Markieren" }).click();

        // A rectangle over the middle of the page, drawn with the pointer.
        const box = await page.locator("[data-page]").first().boundingBox();
        await page.mouse.move(
            box.x + box.width * 0.3,
            box.y + box.height * 0.3,
        );
        await page.mouse.down();
        await page.mouse.move(
            box.x + box.width * 0.6,
            box.y + box.height * 0.4,
            { steps: 5 },
        );
        await page.mouse.up();

        // The mark arrives at once, redacted like any other, and certain:
        // its title names the type and the confidence, and no words — a
        // rectangle covers an area, not a mention.
        const drawn = page.locator(
            '[data-page] button[aria-label^="Person · 100 %"]',
        );
        await expect(drawn).toHaveCount(1);
        // Everything the reader keeps is hatched: the two marks the API
        // found, and now the hand-drawn one.
        await expect.poll(() => hatchedMarkCount(page)).toBe(3);

        // The sidebar takes the row under the person group, numbered after
        // the one the API found.
        await sidebarOf(page).getByRole("button", { name: "Person 2" }).click();

        // The eraser takes it out with a click, as in the text review.
        await page.getByRole("button", { name: "Radieren" }).click();
        await drawn.click();
        await expect(drawn).toHaveCount(0);
        await expect(
            sidebarOf(page).getByRole("button", { name: "Person 2" }),
        ).toHaveCount(0);

        // The removal was an edit like any other: undo draws it back. (The
        // undo button carries no accessible name — it lives in the shared
        // UndoRedoButtons — so it is taken as the first button of the
        // header's tool track, where it stands before the palette.)
        const headerTools = page
            .locator("div")
            .filter({ has: page.getByRole("button", { name: "Markieren" }) })
            .filter({
                has: page.getByRole("button", { name: "Markiertes PDF" }),
            })
            .last();
        await headerTools.locator("button").first().click();
        await expect(drawn).toHaveCount(1);
        await expect(
            sidebarOf(page).getByRole("button", { name: "Person 2" }),
        ).toBeVisible();

        // The guess behind the mark is the reader's to correct: the row's
        // content editor rewrites it, and the mark on the page takes the new
        // words for its title, its numbering and the export.
        await sidebarOf(page)
            .getByRole("button", { name: "Inhalt ändern" })
            .click();
        // Once editing, the row no longer reads "kein Inhalt", so the editor
        // is taken from the detection rows themselves — it is the only
        // textbox in them.
        const editor = sidebarOf(page)
            .locator("[data-detection]")
            .getByRole("textbox");
        await editor.fill("Dozent");
        await editor.press("Enter");
        await expect(
            page.locator(
                '[data-page] button[aria-label^="Person · 100 % · «Dozent»"]',
            ),
        ).toHaveCount(1);
        await expect(
            sidebarOf(page)
                .locator("[data-detection]")
                .filter({ hasText: "Dozent" }),
        ).toHaveCount(1);
    });

    test("the mark tool leaves a click without a drag as a selection, not a mark", async ({
        page,
    }) => {
        await openPdfReview(page);

        // With the marker in hand, a plain click on an existing mark rings
        // its row instead of filing a zero-area rectangle on top of it.
        await page.getByRole("button", { name: "Markieren" }).click();
        const found = page
            .locator('[data-page] button[aria-label*="«Max Mustermann»"]')
            .first();
        // The drawing overlay takes the pointer while the marker is out, so
        // the input goes through the mouse rather than the covered button.
        const foundBox = await found.boundingBox();
        await page.mouse.click(
            foundBox.x + foundBox.width / 2,
            foundBox.y + foundBox.height / 2,
        );

        await expect(
            sidebarOf(page)
                .getByRole("button", { name: "Person 1" })
                .and(page.locator("[aria-expanded=true]")),
        ).toBeVisible();
        // And no mark was drawn on top: still the two the API found.
        await expect(page.locator("[data-page] button")).toHaveCount(2);
    });

    test("the drawn preview and the mark follow the drag on a later page", async ({
        page,
    }) => {
        // Every page carries its own preview element; the regression here
        // had one template ref serve them all, so the rectangle showed on
        // the wrong page and drags on later pages went unnoticed.
        await mockApi(page);
        await page.route("**/api/resource/**", (route) => {
            void route.fulfill({ json: EMPTY_MARKS });
        });
        await page.goto("/new");
        await expect(page.getByText("Dateien hierher ziehen")).toBeVisible();
        await page.locator('input[type="file"]').setInputFiles({
            name: "zweiseiten.pdf",
            mimeType: "application/pdf",
            buffer: twoPagePdf(),
        });
        await expect(
            page.getByText("Bereit zur Verarbeitung (1)"),
        ).toBeVisible();
        await page.getByRole("button", { name: "PDF prüfen" }).first().click();
        await page
            .getByRole("button", { name: "Verarbeitung starten" })
            .click();
        await expect(page.getByText("Geschwärzt")).toBeVisible();
        await page.getByText("zweiseiten.pdf").click();
        await expect(
            page.locator(".vue-pdf-embed__page").first(),
        ).toBeVisible();

        await page.getByRole("button", { name: "Markieren" }).click();

        // Draw on the part of page 2 that is on screen, tightly around one
        // word of the sentence the fixture put there: the text layer carries
        // the whole sentence in one span, and only the covered word may be
        // guessed.
        await page.locator("[data-page]").nth(1).scrollIntoViewIfNeeded();
        await expect(page.locator(".vue-pdf-embed__page").nth(1)).toBeVisible();
        const wordsBox = await page
            .locator("[data-page]")
            .nth(1)
            .evaluate(() => {
                const span = document.querySelector(".textLayer span");
                if (!span?.firstChild) {
                    return null;
                }
                const text = span.textContent ?? "";
                const start = text.indexOf("Geheimdaten");
                const range = document.createRange();
                range.setStart(span.firstChild, start);
                range.setEnd(span.firstChild, start + "Geheimdaten".length);
                return range.getBoundingClientRect().toJSON();
            });
        expect(wordsBox).not.toBeNull();
        await page.mouse.move(wordsBox.x - 4, wordsBox.y - 4);
        await page.mouse.down();
        await page.mouse.move(
            wordsBox.x + wordsBox.width + 4,
            wordsBox.y + wordsBox.height + 4,
            { steps: 8 },
        );

        // Mid-drag, page 2's own preview carries the rectangle.
        const preview = page
            .locator("[data-page]")
            .nth(1)
            .locator("div.absolute.border-2");
        await expect(preview).toBeVisible();
        await expect
            .poll(async () =>
                page.evaluate(
                    (element) => element.style.width,
                    await preview.elementHandle(),
                ),
            )
            .not.toBe("0px");

        await page.mouse.up();

        // The mark lands on page 2 carrying exactly the covered word — not
        // the sentence the span holds: guessed from the text layer, it names
        // the mark and rides along to the sidebar, the numbering and the
        // export.
        await expect(
            page
                .locator("[data-page]")
                .nth(1)
                .locator('button[aria-label="Person · 100 % · «Geheimdaten»"]'),
        ).toHaveCount(1);
        await expect(
            sidebarOf(page).getByRole("button", { name: /Geheimdaten/ }),
        ).toBeVisible();
    });
});
