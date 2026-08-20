import { isApiError } from "@dcc-bs/communication.bs.js";
import type { EntityTypePreset } from "~~/shared/types/redactTypes";

export interface EntityTypeItem {
    name: string;
    description: string;
    enabled: boolean;
    custom: boolean;
}

export function useRedact() {
    const { apiFetch } = useApi();

    const preset = ref<EntityTypePreset>("default");
    const types = ref<EntityTypeItem[]>([]);
    const threshold = ref<number>(0.5);
    const blacklist = ref<string[]>([]);
    const redactedText = ref<string>("");
    const entities = ref<Record<string, Entity[]>>({});
    const isLoadingTypes = ref(false);
    const isRedacting = ref(false);

    let baseline = "";

    function snapshot(): string {
        return JSON.stringify(types.value);
    }

    const isDirty = computed(() => snapshot() !== baseline);

    const entityTypesPayload = computed<Record<string, string>>(() =>
        Object.fromEntries(
            types.value
                .filter((type) => type.enabled)
                .map((type) => [type.name, type.description]),
        ),
    );

    async function loadPreset(nextPreset: EntityTypePreset) {
        isLoadingTypes.value = true;
        try {
            const response = await apiFetch<Record<string, string>>(
                `/api/entity_types/${nextPreset}`,
            );

            if (isApiError(response)) {
                throw response;
            }

            types.value = Object.entries(response).map(
                ([name, description]) => ({
                    name,
                    description,
                    enabled: true,
                    custom: false,
                }),
            );
            preset.value = nextPreset;
            baseline = snapshot();
        } finally {
            isLoadingTypes.value = false;
        }
    }

    function addCustomType(name: string, description: string): boolean {
        const exists = types.value.some(
            (type) => type.name.toLowerCase() === name.toLowerCase(),
        );
        if (exists) {
            return false;
        }

        types.value.push({ name, description, enabled: true, custom: true });
        return true;
    }

    function removeCustomType(name: string) {
        types.value = types.value.filter(
            (type) => !(type.custom && type.name === name),
        );
    }

    async function applyRedact(text: string) {
        isRedacting.value = true;
        try {
            const body = RedactOptionsSchema.parse({
                text: text,
                entity_types: entityTypesPayload.value,
                threshold: threshold.value,
                blacklist: blacklist.value,
            } satisfies RedactOptions);

            const response = await apiFetch("/api/redact", {
                schema: RedactResultSchema,
                body: body,
                method: "POST",
            });

            if (isApiError(response)) {
                throw response;
            }

            redactedText.value = response.text;
            entities.value = response.entities;
        } finally {
            isRedacting.value = false;
        }
    }

    return {
        preset,
        types,
        threshold,
        blacklist,
        isDirty,
        entityTypesPayload,
        redactedText,
        entities,
        isLoadingTypes,
        isRedacting,
        loadPreset,
        addCustomType,
        removeCustomType,
        applyRedact,
    };
}
