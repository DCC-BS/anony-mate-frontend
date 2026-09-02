/**
 * Converts and redacts one uploaded document in a single submission.
 *
 * The file is the only thing that travels: the API keeps the converted text
 * and scans it there, rather than handing it back for the browser to send in
 * again.
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
    .build("/redact/file/async");
