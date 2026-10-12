import { describe, expect, it } from "vitest";
import { describeError } from "./errorDetails";

describe("describeError", () => {
    it("reads a plain error's message", () => {
        expect(describeError(new Error("the scan failed"))).toEqual({
            message: "the scan failed",
        });
    });

    it("reads the status and the body a call was answered with", () => {
        const fetchError = Object.assign(
            new Error("[POST] /api/redact-document: 500"),
            {
                statusCode: 500,
                data: { detail: "boom" },
            },
        );

        expect(describeError(fetchError)).toEqual({
            message: "[POST] /api/redact-document: 500",
            statusCode: 500,
            response: { detail: "boom" },
        });
    });

    it("reads a cause that says more than the error above it", () => {
        const error = new Error("Task failed", {
            cause: new Error("Connection refused"),
        });

        expect(describeError(error)).toEqual({
            message: "Task failed",
            cause: { message: "Connection refused" },
        });
    });

    it("leaves a value that is not an error to stand as it is", () => {
        expect(describeError("just failed")).toBe("just failed");
        expect(describeError(undefined)).toBeUndefined();
    });
});
