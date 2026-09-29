import type { z } from "zod";
import { TaskAcceptedSchema, TaskStateSchema } from "#shared/types/redactTypes";

/** What a task reports on every poll while it runs. */
export type TaskStateListener = (state: {
    progress: number | null;
    queuePosition: number | null;
}) => void;

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
 * @param onState - Called on every poll with what the API knows so far: the
 *   fraction done, and the place in the queue while the work is still waiting.
 * @returns The parsed resource.
 */
export async function runApiTask<T extends z.ZodType>(
    submit: () => Promise<unknown>,
    schema: T,
    onState?: TaskStateListener,
): Promise<z.infer<T>> {
    const resourceId = await awaitApiTask(submit, onState);
    return schema.parse(await $fetch(`/api/resource/${resourceId}`));
}

/**
 * Submits and polls until the task settles, without collecting its result:
 * for a result that is not JSON, collected by its own route.
 *
 * @param submit - Posts the work and resolves with `{ task_id }`.
 * @param onState - Called on every poll, as for `runApiTask`.
 * @returns The id of the finished result, to collect exactly once.
 */
export async function awaitApiTask(
    submit: () => Promise<unknown>,
    onState?: TaskStateListener,
): Promise<string> {
    const pollIntervalMs = useRuntimeConfig().public.pollIntervalMs;

    const { task_id } = TaskAcceptedSchema.parse(await submit());

    for (;;) {
        const state = TaskStateSchema.parse(
            await $fetch(`/api/task/${task_id}`),
        );
        onState?.({
            progress: state.progress ?? null,
            queuePosition: state.queue_position ?? null,
        });

        if (state.status === "failed") {
            throw new Error(state.error ?? "Task failed");
        }
        if (state.status === "finished" && state.resource_id) {
            return state.resource_id;
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
}
