/** Header the API's queue reads to serve each browser's documents in turn. */
const CLIENT_HEADER = "x-client-id";

// Initialize and export the API handler
export const apiHandler = backendHandlerBuilder().extendFetchOptions(
    async (options) => {
        // Every call reaches the API from this server, so without forwarding
        // this the API sees one client and its fair queueing has nothing to
        // distinguish browsers by.
        const clientId = getHeader(options.event, CLIENT_HEADER);
        if (!clientId) {
            return options;
        }

        return {
            ...options,
            headers: { ...options.headers, [CLIENT_HEADER]: clientId },
        };
    },
);
