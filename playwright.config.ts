import { defineConfig, devices } from "@playwright/test";

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // The shared CI workflow's report-summary action reads `results.json`, so
    // it is always emitted; locally the list reporter keeps the run readable.
    reporter: process.env.CI
        ? [["github"], ["json", { outputFile: "results.json" }]]
        : "list",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        // The app's default locale is German; pin the browser locale so
        // detectBrowserLanguage does not redirect the tests to English.
        locale: "de-DE",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: "node .output/server/index.mjs",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            PORT: String(PORT),
            APP_MODE: "ci",
            AUTH_MODE: "none",
            DUMMY: "true",
            NUXT_PUBLIC_COMMON_UI_DISABLE_CHANGELOG: "true",
            NUXT_PUBLIC_COMMON_UI_DISABLE_DISCLAIMER: "true",
            NUXT_PUBLIC_COMMON_UI_DISABLE_ONBOARDING: "true",
            NUXT_PUBLIC_COMMON_UI_DISABLE_SYSTEM_STATUS: "true",
        },
    },
});
