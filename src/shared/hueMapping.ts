/**
 * Hue-aware ANSI color slot assignment
 *
 * Routes extracted wallpaper swatches to their semantically correct ANSI color
 * slots using OKLCH hue angles. For missing hues, synthesizes colors by rotating
 * a donor swatch's hue to the target while reducing chroma for palette harmony.
 */

import { hexToOklch, oklchToHex } from './colorUtils';
import type { OKLCH } from './colorUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnsiHueSlot = 'red' | 'yellow' | 'green' | 'cyan' | 'blue' | 'magenta';

export interface SwatchInput {
  hex: string;
  population: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** OKLCH hue angle targets for each ANSI color slot */
export const ANSI_HUE_TARGETS: Record<AnsiHueSlot, number> = {
  red: 29,
  yellow: 110,
  green: 142,
  cyan: 195,
  blue: 264,
  magenta: 328,
};

/** Swatches with chroma below this are near-gray; their hue is unreliable */
export const MIN_RELIABLE_CHROMA = 0.03;

/** Maximum hue distance (degrees) for a swatch to naturally fill a slot */
export const MAX_HUE_DISTANCE = 60;

/** Chroma reduction factor when synthesizing a fallback color */
export const SYNTHESIS_CHROMA_FACTOR = 0.6;

const ALL_SLOTS: readonly AnsiHueSlot[] = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Circular distance on the 0-360 hue wheel. Returns [0, 180]. */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

interface ResolvedSwatch {
  hex: string;
  oklch: OKLCH;
  population: number;
}

/**
 * Assign wallpaper swatches to the 6 hue-bearing ANSI color slots using
 * OKLCH hue proximity. Always returns all 6 slots filled.
 *
 * Algorithm:
 * 1. Convert swatches to OKLCH, separate chromatic from achromatic
 * 2. Greedy most-constrained-first: assign the slot with fewest viable
 *    candidates first, picking the closest unassigned swatch (tiebreak: population)
 * 3. Synthesize any remaining slots from the nearest assigned donor
 */
export function assignSwatchesToAnsiSlots(
  swatches: SwatchInput[],
): Record<AnsiHueSlot, string> {
  // --- Step 1: Convert & partition -------------------------------------------
  const chromatic: ResolvedSwatch[] = [];
  const achromatic: ResolvedSwatch[] = [];

  for (const sw of swatches) {
    const oklch = hexToOklch(sw.hex);
    if (!oklch) continue;

    const resolved: ResolvedSwatch = { hex: sw.hex, oklch, population: sw.population };

    if (oklch.c < MIN_RELIABLE_CHROMA) {
      achromatic.push(resolved);
    } else {
      chromatic.push(resolved);
    }
  }

  // --- Step 2: Greedy most-constrained-first assignment ----------------------
  const assigned = new Map<AnsiHueSlot, ResolvedSwatch>();
  const usedSwatches = new Set<ResolvedSwatch>();

  // Build candidate lists: for each slot, which chromatic swatches are within range?
  const candidates = new Map<AnsiHueSlot, ResolvedSwatch[]>();
  for (const slot of ALL_SLOTS) {
    const target = ANSI_HUE_TARGETS[slot];
    const viable = chromatic
      .filter((sw) => hueDistance(sw.oklch.h, target) <= MAX_HUE_DISTANCE)
      .sort((a, b) => {
        const dA = hueDistance(a.oklch.h, target);
        const dB = hueDistance(b.oklch.h, target);
        if (dA !== dB) return dA - dB;
        return b.population - a.population; // higher population wins tie
      });
    candidates.set(slot, viable);
  }

  // Sort slots by number of viable candidates (ascending = most constrained first)
  const slotOrder = [...ALL_SLOTS].sort((a, b) => {
    const aLen = candidates.get(a)?.length ?? 0;
    const bLen = candidates.get(b)?.length ?? 0;
    return aLen - bLen;
  });

  for (const slot of slotOrder) {
    const viable = candidates.get(slot);
    if (!viable) continue;

    for (const sw of viable) {
      if (!usedSwatches.has(sw)) {
        assigned.set(slot, sw);
        usedSwatches.add(sw);
        break;
      }
    }
  }

  // --- Step 3: Synthesize missing slots --------------------------------------
  const result = {} as Record<AnsiHueSlot, string>;

  // Collect assigned entries for donor lookup
  const assignedEntries = [...assigned.entries()];

  for (const slot of ALL_SLOTS) {
    const match = assigned.get(slot);
    if (match) {
      result[slot] = match.hex;
      continue;
    }

    // Find the nearest assigned slot's color as donor
    const donor = findNearestDonor(slot, assignedEntries, achromatic);
    result[slot] = synthesizeColor(donor, ANSI_HUE_TARGETS[slot]);
  }

  return result;
}

/**
 * Find the best donor OKLCH for synthesizing a missing slot's color.
 * Prefers the nearest assigned slot by hue distance; falls back to achromatic
 * swatches, then a neutral midtone.
 */
function findNearestDonor(
  slot: AnsiHueSlot,
  assignedEntries: [AnsiHueSlot, ResolvedSwatch][],
  achromatic: ResolvedSwatch[],
): OKLCH {
  const target = ANSI_HUE_TARGETS[slot];

  if (assignedEntries.length > 0) {
    let best = assignedEntries[0]![1];
    let bestDist = hueDistance(ANSI_HUE_TARGETS[assignedEntries[0]![0]], target);

    for (let i = 1; i < assignedEntries.length; i++) {
      const entry = assignedEntries[i]!;
      const dist = hueDistance(ANSI_HUE_TARGETS[entry[0]], target);
      if (dist < bestDist) {
        bestDist = dist;
        best = entry[1];
      }
    }
    return best.oklch;
  }

  // No chromatic assignments at all — try achromatic swatches
  if (achromatic.length > 0) {
    // Pick the one with highest population as most representative
    const best = achromatic.reduce((a, b) => (b.population > a.population ? b : a));
    return best.oklch;
  }

  // Zero-input fallback: neutral midtone
  return { l: 0.6, c: 0.05, h: 0 };
}

/**
 * Synthesize a color for a missing ANSI slot by rotating a donor's hue
 * to the target and reducing chroma for palette harmony.
 */
function synthesizeColor(donor: OKLCH, targetHue: number): string {
  return oklchToHex({
    l: donor.l,
    c: donor.c * SYNTHESIS_CHROMA_FACTOR,
    h: targetHue,
  });
}
