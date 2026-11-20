/**
 * A thrown value as the flat fields the DCC-BS log contract expects.
 *
 * An `Error`'s fields are not enumerable, so the log shows it as an empty
 * object. The contract also wants `error` as a string and no nested objects,
 * so a failure reports its message, its class, the status it came with and,
 * for an API error (`{ errorId, status, debugMessage }`), its id and a
 * truncated debug message. The rest of the answer body stays out of the log:
 * it may echo the document being processed.
 *
 * @param error - Whatever was caught.
 * @returns Flat fields to spread into a log call.
 */
/** Longest debug message kept in a log line. */
const DEBUG_MESSAGE_MAX = 500;

export function describeError(error: unknown): Record<string, string | number> {
    if (!(error instanceof Error)) {
        return { error: String(error) };
    }

    // A $fetch error carries the call's answer alongside: the status it came
    // with and the body that travelled with it.
    const { message, name, cause, statusCode, data } = error as Error & {
        statusCode?: number;
        data?: { errorId?: unknown; debugMessage?: unknown };
    };

    const debugMessage = data?.debugMessage;

    return {
        error: message,
        error_type: name,
        ...(cause instanceof Error ? { cause: cause.message } : {}),
        ...(statusCode !== undefined ? { status_code: statusCode } : {}),
        ...(typeof data?.errorId === "string"
            ? { error_id: data.errorId }
            : {}),
        ...(typeof debugMessage === "string"
            ? { debug_message: debugMessage.slice(0, DEBUG_MESSAGE_MAX) }
            : {}),
    };
}
