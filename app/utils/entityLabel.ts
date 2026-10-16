/**
 * Derives an entity type's API label from its display name: lower case,
 * umlauts transliterated, blanks and punctuation collapsed to hyphens.
 *
 * `Neue Adresse` becomes `neue-adresse`, `Größe & Typ` becomes
 * `groesse-typ`. An input without any usable character comes back empty.
 *
 * @param value - The display name to derive the label from.
 * @returns The generated label, or the empty string.
 */
export function slugifyLabel(value: string): string {
    return value
        .toLowerCase()
        .replaceAll("ä", "ae")
        .replaceAll("ö", "oe")
        .replaceAll("ü", "ue")
        .replaceAll("ß", "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
