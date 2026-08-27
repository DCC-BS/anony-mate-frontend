import { tryOnScopeDispose } from "@vueuse/core";
import { liveQuery } from "dexie";

/**
 * Reactive view of an IndexedDB query.
 *
 * The subscription is bound to the effect scope rather than to a component's
 * mount, so it survives navigation and works inside shared composables. It is
 * client-only: IndexedDB does not exist during SSR.
 *
 * @param querier - The Dexie query to observe.
 * @param initial - Value to use until the first result arrives.
 * @returns The query result, kept up to date.
 */
export function useLiveQuery<T>(
    querier: () => T | Promise<T>,
    initial: T,
): Ref<T> {
    const result = ref(initial) as Ref<T>;

    if (import.meta.client) {
        const subscription = liveQuery(querier).subscribe({
            next: (value) => {
                result.value = value;
            },
            error: (error) => {
                console.error("Live query failed", error);
            },
        });

        tryOnScopeDispose(() => subscription.unsubscribe());
    }

    return result;
}
