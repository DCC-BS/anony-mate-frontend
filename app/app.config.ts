export default defineAppConfig({
    ui: {
        card: {
            slots: {
                body: "p-4 sm:p-4",
            },
            variants: {
                variant: {
                    // The default outline variant draws a ring and divider around
                    // every card; the design keeps cards flat. Add `ring ring-default`
                    // on a card that genuinely needs to enclose scrolling content.
                    outline: {
                        root: "ring-0 divide-y-0",
                    },
                },
            },
        },
    },
});
