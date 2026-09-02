import { isApiError } from "@dcc-bs/communication.bs.js";
import { createSharedComposable } from "@vueuse/core";
import { db } from "~/stores/db";
import type {
    StoredBlacklistTerm,
    StoredEntityGroup,
    StoredEntityType,
} from "~/types/storedEntity";
import { ApiEntityPresetSchema } from "~~/shared/types/redactTypes";

/**
 * Entity types, detection groups and never-redact terms, kept in IndexedDB and
 * seeded from the API presets on first run.
 *
 * @returns The reactive lists and their operations.
 */
export const useEntityGroups = createSharedComposable(() => {
    const service = getEntityService();
    const { apiFetch } = useApi();
    const logger = useLogger();

    const groups = useLiveQuery<StoredEntityGroup[]>(
        () => db.entityGroups.toArray(),
        [],
    );
    const types = useLiveQuery<StoredEntityType[]>(
        () => db.entityTypes.toArray(),
        [],
    );
    const blacklistEntries = useLiveQuery<StoredBlacklistTerm[]>(
        () => db.blacklist.orderBy("createdAt").toArray(),
        [],
    );
    const blacklist = computed(() =>
        blacklistEntries.value.map((entry) => entry.term),
    );

    onMounted(async () => {
        try {
            await service.syncBuiltins(async (preset) => {
                const response = await apiFetch<object>(
                    `/api/entity_types/${preset}`,
                );

                if (isApiError(response)) {
                    throw response;
                }

                return ApiEntityPresetSchema.parse(response);
            });
        } catch (error) {
            logger.error({ error }, "Could not sync entity presets");
        }
    });

    /** Description lookup, so a group can be turned into an API payload. */
    const descriptionOf = computed(() =>
        Object.fromEntries(
            types.value.map((type) => [type.name, type.description]),
        ),
    );

    /**
     * The entity types of a group in the shape the API expects.
     */
    function payloadFor(groupId: string): Record<string, string> {
        const group = groups.value.find((entry) => entry.id === groupId);

        return Object.fromEntries(
            (group?.labels ?? []).map((label) => [
                label,
                descriptionOf.value[label] ?? "",
            ]),
        );
    }

    return { groups, types, blacklist, payloadFor, ...service };
});
