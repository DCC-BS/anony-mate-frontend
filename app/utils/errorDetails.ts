/**
 * A thrown value as the flat fields the DCC-BS log contract expects.
 *
 * An `Error`'s fields are not enumerable, so the log shows it as an empty
 * object. The contract also wants `error` as a string and no nested objects,
 * so a failure reports its message, its class, the status it came with and,
 * for an API error, the short `detail` text. The rest of the answer body
 * stays out of the log: it may echo the document being processed.
 *
 * @param error - Whatever was caught.
 * @returns Flat fields to spread into a log call.
 */
export function describeError(error: unknown): Record<string, string | number> {
    if (!(error instanceof Error)) {
        return { error: String(error) };
    }

    // A $fetch error carries the call's answer alongside: the status it came
    // with and the body that travelled with it.
    const { message, name, cause, statusCode, data } = error as Error & {
        statusCode?: number;
        data?: { detail?: unknown };
    };

    return {
        error: message,
        error_type: name,
        ...(cause instanceof Error ? { cause: cause.message } : {}),
        ...(statusCode !== undefined ? { status_code: statusCode } : {}),
        ...(typeof data?.detail === "string"
            ? { error_detail: data.detail }
            : {}),
    };
}
