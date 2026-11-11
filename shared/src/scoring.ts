// Scoring geometry. All positions are normalised to 0..1 across the dial's arc
// (0 = left end, 1 = right end). The target is five equal bands:
//   [2][3][4][3][2]  — a bullseye flanked by an inner and an outer ring.

export const BAND = 0.042; // width of a single band (≈ 7.6° of a 180° arc)
export const TARGET_HALF_WIDTH = BAND * 2.5;

export function scoreFor(needle: number, target: number): number {
  const d = Math.abs(needle - target);
  // Small epsilon so a needle resting exactly on a border goes to the better band.
  const e = 1e-9;
  if (d <= BAND * 0.5 + e) return 4;
  if (d <= BAND * 1.5 + e) return 3;
  if (d <= BAND * 2.5 + e) return 2;
  return 0;
}

/** Random target centre that keeps all five bands on the dial. */
export function randomTarget(rand: () => number = Math.random): number {
  const min = TARGET_HALF_WIDTH;
  const max = 1 - TARGET_HALF_WIDTH;
  return min + rand() * (max - min);
}

/** Which side of the guess the target actually sits on. */
export function targetSide(needle: number, target: number): 'left' | 'right' {
  return target < needle ? 'left' : 'right';
}

export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);
