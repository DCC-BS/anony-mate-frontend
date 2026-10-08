import { describe, expect, it } from "vitest";
import { PdfAnnotationsResultSchema } from "#shared/types/redactTypes";

describe("PdfAnnotationsResultSchema", () => {
    it("parses the API's serialized contract", () => {
        // Exactly what /resource/{id} served in the failing run, plus the
        // page_sizes field the contract now carries.
        const response = {
            annotations: [
                {
                    id: "d1",
                    label: "person",
                    text: "Baugesuch",
                    confidence: 0.2327744960784912,
                    boxes: [
                        {
                            page: 1,
                            left: 69.335,
                            top: 70.719,
                            right: 134.701,
                            bottom: 87.149,
                        },
                    ],
                },
            ],
            page_sizes: { 1: [595.28, 841.89] },
        };

        const parsed = PdfAnnotationsResultSchema.parse(response);

        expect(parsed.annotations[0]?.boxes[0]?.page).toBe(1);
        expect(parsed.page_sizes[1]).toEqual([595.28, 841.89]);
    });

    it("refuses a response without the page sizes", () => {
        const response = { annotations: [] };

        expect(() => PdfAnnotationsResultSchema.parse(response)).toThrow();
    });
});
