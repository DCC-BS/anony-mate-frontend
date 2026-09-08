import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./test/setup.ts"],
        include: ["app/**/*.test.ts", "shared/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "#shared": fileURLToPath(new URL("../shared", import.meta.url)),
            "~": fileURLToPath(new URL("../app", import.meta.url)),
        },
    },
});
