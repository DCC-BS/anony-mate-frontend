/**
 * Writes the reviewed marks of a PDF onto the PDF itself.
 *
 * The file and the marks travel as one submission, as for the redact
 * endpoint: the marked PDF is the only thing that comes back, collected by
 * `resource/[id]` once the task has finished.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<FormData>(async (event) => {
        const inputFormData = await readFormData(event);
        const file = inputFormData.get("file");
        const options = inputFormData.get("options");

        if (!file || !(file instanceof File)) {
            throw createError({
                statusCode: 400,
                statusMessage: "File is required and must be a valid file",
            });
        }
        if (typeof options !== "string") {
            throw createError({
                statusCode: 400,
                statusMessage: "Options are required and must be JSON encoded",
            });
        }

        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("options", options);
        return formData;
    })
    .build("/redact/pdf/annotate/async");
