import { describe, expect, it } from "vitest";
import { describeError } from "./errorDetails";

describe("describeError", () => {
    it("reads a plain error's message and class", () => {
        expect(describeError(new Error("the scan failed"))).toEqual({
            error: "the scan failed",
            error_type: "Error",
        });
    });

    it("reads the status and the detail a call was answered with", () => {
        const fetchError = Object.assign(
            new Error("[POST] /api/redact-document: 500"),
            {
                statusCode: 500,
                data: { detail: "boom" },
            },
        );

        expect(describeError(fetchError)).toEqual({
            error: "[POST] /api/redact-document: 500",
            error_type: "Error",
            status_code: 500,
            error_detail: "boom",
        });
    });

    it("leaves a structured answer body out of the log", () => {
        const fetchError = Object.assign(new Error("Unprocessable"), {
            statusCode: 422,
            data: { detail: [{ input: "document text" }] },
        });

        expect(describeError(fetchError)).toEqual({
            error: "Unprocessable",
            error_type: "Error",
            status_code: 422,
        });
    });

    it("reads a cause that says more than the error above it", () => {
        const error = new Error("Task failed", {
            cause: new Error("Connection refused"),
        });

        expect(describeError(error)).toEqual({
            error: "Task failed",
            error_type: "Error",
            cause: "Connection refused",
        });
    });

    it("turns a value that is not an error into the error text", () => {
        expect(describeError("just failed")).toEqual({ error: "just failed" });
        expect(describeError(undefined)).toEqual({ error: "undefined" });
    });
});
