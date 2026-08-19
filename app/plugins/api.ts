import {
    createFetcherBuilder,
    createApiClient,
} from "@dcc-bs/communication.bs.js";

export default defineNuxtPlugin(() => {
    const fetcher = createFetcherBuilder()
        .enableDebug(!!import.meta.dev)
        .build();

    // Create the API client
    const apiClient = createApiClient(fetcher);

    // Provide the client to the app
    return {
        provide: {
            api: apiClient,
        },
    };
});
