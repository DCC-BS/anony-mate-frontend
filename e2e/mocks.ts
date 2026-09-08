import type { Page } from "@playwright/test";

/** A small preset served for every entity type endpoint. */
export const PRESET = {
    person: { name: "Person", description: "A person's name" },
    ort: { name: "Ort", description: "A place" },
};

/** A redaction result with one person and one place detection. */
export const REDACT_RESULT = {
    text: "Max Mustermann wohnt in Berlin.",
    entities: {
        person: [
            {
                id: "person-0",
                text: "Max Mustermann",
                label: "person",
                start: 0,
                end: 14,
                confidence: 0.95,
            },
        ],
        ort: [
            {
                id: "ort-0",
                text: "Berlin",
                label: "ort",
                start: 24,
                end: 30,
                confidence: 0.9,
            },
        ],
    },
};

/**
 * Intercepts every API call the app makes and answers it from fixtures, so
 * the e2e run needs no backend.
 *
 * The queue submits a task, polls it, then collects the resource; each of
 * those is a separate route. The task answers `finished` on the first poll, so
 * a document moves straight to `ready` without waiting out the poll interval.
 */
export async function mockApi(page: Page): Promise<void> {
    await page.route("**/api/entity_types/**", (route) => {
        void route.fulfill({ json: PRESET });
    });

    await page.route("**/api/redact", (route) => {
        void route.fulfill({ json: { task_id: "task-1" } });
    });

    await page.route("**/api/redact-document", (route) => {
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
        void route.fulfill({ json: REDACT_RESULT });
    });
}
