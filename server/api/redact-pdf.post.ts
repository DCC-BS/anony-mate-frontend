/**
 * Scans an uploaded PDF for redaction without converting it to text.
 *
 * The file is the only thing that travels: by default the marks found come
 * back, to draw over the file the browser kept; with `marked_pdf` set the
 * PDF itself comes back marked. The result is collected by `resource/[id]`
 * once the task has finished.
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
    .build("/anonymize/pdf/async");
