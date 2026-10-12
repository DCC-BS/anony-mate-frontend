/**
 * A thrown value as a log line can read it.
 *
 * An `Error`'s fields are not enumerable, so the log shows it as an empty
 * object, and the one thing a failure wants to say — what it was about, what
 * answered, and with what — stays behind. A failed call reports its message,
 * its status and the body the API answered with.
 *
 * @param error - Whatever was caught.
 * @returns A plain object the log serialises, or the value as it is.
 */
export function describeError(error: unknown): unknown {
    if (!(error instanceof Error)) {
        return error;
    }

    // A $fetch error carries the call's answer alongside: the status it came
    // with and the body that travelled with it.
    const { message, cause, statusCode, data } = error as Error & {
        statusCode?: number;
        data?: unknown;
    };

    return {
        message,
        ...(cause !== undefined ? { cause: describeError(cause) } : {}),
        ...(statusCode !== undefined ? { statusCode } : {}),
        ...(data !== undefined ? { response: data } : {}),
    };
}
