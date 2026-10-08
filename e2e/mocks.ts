import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** What the API sends back for a PDF scanned for the review: its marks. */
export const PDF_ANNOTATIONS = {
    annotations: [
        {
            id: "d1",
            label: "person",
            text: "Max Mustermann",
            confidence: 0.95,
            boxes: [{ page: 1, left: 60, top: 100, right: 180, bottom: 112 }],
        },
        {
            id: "d2",
            label: "ort",
            text: "Berlin",
            confidence: 0.9,
            boxes: [{ page: 1, left: 200, top: 100, right: 240, bottom: 112 }],
        },
    ],
    page_sizes: { 1: [595, 842] },
};

/** A one-page PDF with nothing on it, for the viewer and for the export. */
export const BLANK_PDF = readFileSync(join(__dirname, "./fixtures/blank.pdf"));

/** What the API sends back for the reviewed marks: the PDF itself. */
export const ANNOTATED_PDF = BLANK_PDF;

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

    // A PDF review's scan collects the marks instead of a redaction result.
    // The task id tells them apart: the scan is submitted to the same task
    // route, so the resource is chosen by which submission it followed.
    await page.route("**/api/annotate-pdf/**", (route) => {
        void route.fulfill({
            body: ANNOTATED_PDF,
            contentType: "application/pdf",
            headers: { "X-Mark-Count": "2" },
        });
    });
}
