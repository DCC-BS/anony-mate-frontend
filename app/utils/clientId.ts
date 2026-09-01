const STORAGE_KEY = "anonymate-client-id";

/**
 * A stable id for this browser, sent with every submission.
 *
 * The API queues work per client and serves clients in turn, so one browser
 * with a long list of documents cannot park another behind it. Tabs share the
 * id deliberately: they share the document queue too, so they are one client.
 *
 * @returns The id, creating and storing one on first use.
 */
export function clientId(): string {
    // Private windows and blocked site data make storage throw rather than
    // return null, and a per-call id is still better than none.
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return stored;
        }

        const created = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, created);
        return created;
    } catch {
        return "anonymous";
    }
}
