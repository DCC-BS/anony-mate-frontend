import { expect, test } from "@playwright/test";
import { mockApi } from "./mocks";

test.describe("entities", () => {
    test("seeds the built-in presets and shows them", async ({ page }) => {
        await mockApi(page);
        await page.goto("/entities");

        // The default preset's types are seeded from the API, in the entity
        // panel (the section headed "Entitäten").
        const panel = page
            .locator("section")
            .filter({ has: page.getByRole("heading", { name: "Entitäten" }) });
        await expect(panel.getByText("Person", { exact: true })).toBeVisible();
        await expect(panel.getByText("Ort", { exact: true })).toBeVisible();
    });

    test("adds a custom entity type", async ({ page }) => {
        await mockApi(page);
        await page.goto("/entities");

        // Open the add-type popover.
        await page.getByTitle("Neue Entität").click();
        await page.getByPlaceholder("z. B. projektname").fill("projektname");
        await page
            .getByPlaceholder("Anzeigename, z. B. Person")
            .fill("Projektname");
        await page
            .getByPlaceholder("Beschreibung des gesuchten Inhalts")
            .fill("Der Name eines Projekts");
        await page.getByRole("button", { name: "Anlegen" }).click();

        // The new type appears in the list.
        await expect(
            page.getByText("projektname", { exact: true }),
        ).toBeVisible();
    });

    test("adds a never-redact term", async ({ page }) => {
        await mockApi(page);
        await page.goto("/entities");

        const blacklist = page.locator("section").filter({
            has: page.getByRole("heading", { name: "Nie schwärzen" }),
        });
        const input = blacklist.getByPlaceholder("z. B. Basel-Stadt");
        await input.fill("Basel-Stadt");
        await input.press("Enter");

        await expect(blacklist.getByText("Basel-Stadt")).toBeVisible();
    });
});
