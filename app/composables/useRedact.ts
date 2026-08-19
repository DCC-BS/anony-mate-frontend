import { isApiError } from "@dcc-bs/communication.bs.js";
import type { EntityTypePreset } from "~~/shared/types/redactTypes";


export function useRedact() {
    const { apiFetch } = useApi();

    const entityTypes = ref<Record<string, string>>({});
    const redactedText = ref<string>("");
    const entities = ref<Record<string, Entity[]>>({});

    async function loadEntityTypes(preset: EntityTypePreset) {
        const response = await apiFetch<Record<string, string>>(`/api/entity_types/${preset}`);

        if (isApiError(response)) {
            throw response;
        }

        entityTypes.value = response;
    }

    async function applyRedact(text: string) {
        const body = RedactOptionsSchema.parse({
            text: text,
            entity_types: entityTypes.value,
        } satisfies RedactOptions);

        const response = await apiFetch("/api/redact", {
            schema: RedactResultSchema,
            body: body
        });

        if (isApiError(response)) {
            throw response;
        }

        redactedText.value = response.text;
        entities.value = response.entities;
    }

    return {
        entityTypes,
        redactedText,
        entities,
        loadEntityTypes,
        applyRedact
    }
}
