/** Placeholders a replacement template understands, with a short explanation. */
export function useReplacementTokens() {
    const { t } = useI18n();

    return computed(() =>
        ["name", "label", "subject", "occurrence"].map((token) => ({
            token,
            placeholder: `{${token}}`,
            description: t(`entities.replacement.tokens.${token}`),
        })),
    );
}
