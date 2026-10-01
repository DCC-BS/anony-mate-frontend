/**
 * Collects a marked PDF: the API's resource, passed through as it comes.
 *
 * The same resource as `/api/resource/[id]`, but the body is the PDF itself,
 * not JSON, so it is not parsed on the way; the number of marks travels in
 * the `X-Mark-Count` header.
 */
export default apiHandler
    .withMethod("GET")
    .withRawFetcher()
    .build("/resource/[r:id]");
