import type { z } from "zod";
import { TaskAcceptedSchema, TaskStateSchema } from "#shared/types/redactTypes";

/** Conversions and scans run for minutes, so polling often only adds noise. */
const POLL_INTERVAL_MS = 10_000;

/**
 * Runs one long API operation through its task endpoints.
 *
 * The API answers a submission with a task id instead of holding the
 * connection open, so a slow conversion or scan cannot be cut off by a proxy.
 * This submits, polls until the task settles, then collects the result — which
 * the API drops as it is read.
 *
 * @param submit - Posts the work and resolves with `{ task_id }`.
 * @param schema - Shape of the collected resource.
 * @param onProgress - Called with the fraction done, when the API reports one.
 * @returns The parsed resource.
 */
export async function runApiTask<T extends z.ZodType>(
    submit: () => Promise<unknown>,
    schema: T,
    onProgress?: (progress: number | null) => void,
): Promise<z.infer<T>> {
    const { task_id } = TaskAcceptedSchema.parse(await submit());

    for (;;) {
        const state = TaskStateSchema.parse(
            await $fetch(`/api/task/${task_id}`),
        );
        onProgress?.(state.progress ?? null);

        if (state.status === "failed") {
            throw new Error(state.error ?? "Task failed");
        }
        if (state.status === "finished" && state.resource_id) {
            return schema.parse(
                await $fetch(`/api/resource/${state.resource_id}`),
            );
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}
