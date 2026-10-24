import { expect, test } from "@playwright/test";
import { mockApi, waitForHydration } from "./mocks";

test.describe("entities", () => {
    test("seeds the built-in presets and shows them", async ({ page }) => {
        await mockApi(page);
        await page.goto("/entities");
        await waitForHydration(page);

        // The types tab lists the seeded presets; each row shows the display
        // name and, in mono, the API label.
        const list = page.locator("#entity-panel");
        await expect(list.getByText("Person", { exact: true })).toBeVisible();
        await expect(list.getByText("Ort", { exact: true })).toBeVisible();
    });

    test("adds a custom entity type with a generated label", async ({
        page,
    }) => {
        await mockApi(page);
        await page.goto("/entities");
        await waitForHydration(page);

        // The editor opens on a fresh draft; the display name comes first and
        // the API label generates itself from it.
        await page.getByTitle("Neuer Entitätstyp").click();
        await page.getByPlaceholder("z. B. Postleitzahl").fill("Projektname");
        await expect(
            page.getByPlaceholder("automatisch aus dem Anzeigenamen"),
        ).toHaveValue("projektname");
        await page
            .getByPlaceholder("Beschreibung des gesuchten Inhalts")
            .fill("Der Name eines Projekts");
        await page
            .getByPlaceholder("Beschreibung des gesuchten Inhalts")
            .press("Tab");

        // The type is in the list once a field lost focus (auto-save).
        await expect(
            page
                .locator("#entity-panel")
                .getByText("projektname", { exact: true }),
        ).toBeVisible();
    });

    test("moves an entity type out of a group by drag and drop", async ({
        page,
    }) => {
        await mockApi(page);
        await page.goto("/entities?tab=groups");
        await waitForHydration(page);

        // Every preset group detects person and ort; open the default group.
        await page
            .locator("#group-panel button")
            .filter({ hasText: "Standard" })
            .click();
        const available = page.getByRole("group", { name: "Verfügbar" });
        const members = page.getByRole("group", { name: "In der Gruppe" });
        await expect(
            members.getByText("Person", { exact: true }),
        ).toBeVisible();

        // Drag Person from the group into the available pane.
        await members.getByText("Person", { exact: true }).dragTo(available);
        await expect(members.getByText("Person", { exact: true })).toBeHidden();
        await expect(
            available.getByText("Person", { exact: true }),
        ).toBeVisible();

        // The click path brings it back.
        await available
            .getByRole("button", { name: "Person zur Gruppe hinzufügen" })
            .click();
        await expect(
            members.getByText("Person", { exact: true }),
        ).toBeVisible();
    });

    test("adds a never-redact term", async ({ page }) => {
        await mockApi(page);
        await page.goto("/entities?tab=blacklist");
        await waitForHydration(page);

        const blacklist = page.locator("#blacklist-editor");
        const input = blacklist.getByPlaceholder("z. B. Basel-Stadt");
        await input.fill("Basel-Stadt");
        await input.press("Enter");

        await expect(blacklist.getByText("Basel-Stadt")).toBeVisible();
    });

    test("searches the never-redact terms", async ({ page }) => {
        await mockApi(page);
        await page.goto("/entities?tab=blacklist");
        await waitForHydration(page);

        const blacklist = page.locator("#blacklist-editor");
        const input = blacklist.getByPlaceholder("z. B. Basel-Stadt");
        await input.fill("Basel-Stadt");
        await input.press("Enter");
        await expect(blacklist.getByText("Basel-Stadt")).toBeVisible();
        await input.fill("Zürich");
        await input.press("Enter");
        await expect(blacklist.getByText("Zürich")).toBeVisible();

        await blacklist
            .getByPlaceholder("2 Begriffe durchsuchen…")
            .fill("basel");
        await expect(blacklist.getByText("Zürich")).toHaveCount(0);
        await expect(blacklist.getByText("Basel-Stadt")).toBeVisible();
    });
});
