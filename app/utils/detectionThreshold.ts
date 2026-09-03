/**
 * Confidence a detection needs before the API reports it.
 *
 * Low on purpose: what the detector is unsure about is exactly what a reader
 * needs to see, and the review is where a weak detection is dismissed. The
 * document's own slider raises the floor afterwards, so this is also the
 * lowest the slider can go — nothing below it was ever detected.
 */
export const DETECTION_THRESHOLD = 0.2;
