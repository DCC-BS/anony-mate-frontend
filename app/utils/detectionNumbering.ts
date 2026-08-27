import type { Entity } from "#shared/types/redactTypes";

export interface NumberedEntity extends Entity {
    /** Position among all detections of the label, 1-based. */
    occurrenceIndex: number;
    /** Number of the distinct value within the label, 1-based. */
    subjectIndex: number;
}

/**
 * Numbers a label's detections twice: once by occurrence, once by distinct
 * value. Repeated mentions of the same text share a subject number, so a
 * person keeps one number throughout the document.
 *
 * @param entities - The label's detections, in any order.
 * @returns The detections in document order, each with both numbers.
 */
export function numberEntities(entities: Entity[]): NumberedEntity[] {
    const subjectNumbers = new Map<string, number>();

    return [...entities]
        .sort((a, b) => a.start - b.start)
        .map((entity, index) => {
            const key = entity.text.trim().toLowerCase();

            if (!subjectNumbers.has(key)) {
                subjectNumbers.set(key, subjectNumbers.size + 1);
            }

            return {
                ...entity,
                occurrenceIndex: index + 1,
                subjectIndex: subjectNumbers.get(key) as number,
            };
        });
}
