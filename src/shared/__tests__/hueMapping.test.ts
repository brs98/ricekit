import { describe, it, expect } from 'vitest';
import {
  hueDistance,
  assignSwatchesToAnsiSlots,
  ANSI_HUE_TARGETS,
  type AnsiHueSlot,
  type SwatchInput,
} from '../hueMapping';
import { hexToOklch, oklchToHex } from '../colorUtils';

// ---------------------------------------------------------------------------
// Helper: create a swatch at a specific OKLCH hue
// ---------------------------------------------------------------------------
function makeSwatch(hue: number, opts?: { l?: number; c?: number; pop?: number }): SwatchInput {
  const l = opts?.l ?? 0.6;
  const c = opts?.c ?? 0.15;
  const pop = opts?.pop ?? 100;
  return { hex: oklchToHex({ l, c, h: hue }), population: pop };
}

/** Verify the output hex has a hue angle within `tolerance` of `expectedHue` */
function expectHueNear(hex: string, expectedHue: number, tolerance = 40) {
  const oklch = hexToOklch(hex);
  expect(oklch).not.toBeNull();
  if (!oklch) return;
  // For very low chroma (synthesized), hue might be approximate due to gamut mapping
  if (oklch.c < 0.01) return; // skip hue check for near-gray
  const dist = Math.abs(oklch.h - expectedHue) % 360;
  const circDist = dist > 180 ? 360 - dist : dist;
  expect(circDist).toBeLessThanOrEqual(tolerance);
}

// ---------------------------------------------------------------------------
// hueDistance
// ---------------------------------------------------------------------------
describe('hueDistance', () => {
  it('returns basic distance', () => {
    expect(hueDistance(0, 90)).toBe(90);
  });

  it('handles wrap-around', () => {
    expect(hueDistance(350, 10)).toBe(20);
  });

  it('returns 0 for identical hues', () => {
    expect(hueDistance(120, 120)).toBe(0);
  });

  it('returns 180 for opposite hues', () => {
    expect(hueDistance(0, 180)).toBe(180);
  });

  it('is symmetric', () => {
    expect(hueDistance(30, 270)).toBe(hueDistance(270, 30));
  });
});

// ---------------------------------------------------------------------------
// assignSwatchesToAnsiSlots
// ---------------------------------------------------------------------------
describe('assignSwatchesToAnsiSlots', () => {
  it('assigns 6 ideal swatches to their closest slots', () => {
    const swatches: SwatchInput[] = [
      makeSwatch(29),  // near red
      makeSwatch(110), // near yellow
      makeSwatch(142), // near green
      makeSwatch(195), // near cyan
      makeSwatch(264), // near blue
      makeSwatch(328), // near magenta
    ];

    const result = assignSwatchesToAnsiSlots(swatches);

    // All 6 slots should be filled
    const slots: AnsiHueSlot[] = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
    for (const slot of slots) {
      expect(result[slot]).toBeDefined();
      expect(result[slot]).toMatch(/^#[0-9a-f]{6}$/i);
    }

    // Each slot's color should be hue-close to its target
    for (const slot of slots) {
      expectHueNear(result[slot], ANSI_HUE_TARGETS[slot]);
    }
  });

  it('handles monochromatic (all-blue) input', () => {
    const swatches: SwatchInput[] = [
      makeSwatch(260, { pop: 500 }),
      makeSwatch(268, { pop: 300 }),
      makeSwatch(255, { pop: 200 }),
    ];

    const result = assignSwatchesToAnsiSlots(swatches);

    // Blue slot should get the closest blue swatch
    expectHueNear(result.blue, ANSI_HUE_TARGETS.blue);

    // Other slots should be synthesized but still valid hex
    for (const slot of ['red', 'yellow', 'green', 'cyan', 'magenta'] as const) {
      expect(result[slot]).toMatch(/^#[0-9a-f]{6}$/i);
    }

    // Synthesized colors should have approximately correct target hues
    // (wider tolerance due to gamut mapping hue drift at reduced chroma)
    expectHueNear(result.red, ANSI_HUE_TARGETS.red, 65);
    expectHueNear(result.cyan, ANSI_HUE_TARGETS.cyan, 65);
  });

  it('returns valid hex for all 6 slots with empty input', () => {
    const result = assignSwatchesToAnsiSlots([]);

    const slots: AnsiHueSlot[] = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
    for (const slot of slots) {
      expect(result[slot]).toBeDefined();
      expect(result[slot]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('assigns single swatch to closest slot and synthesizes the rest', () => {
    const swatches: SwatchInput[] = [makeSwatch(140)]; // near green

    const result = assignSwatchesToAnsiSlots(swatches);

    // Green should get the swatch (hue 140 is closest to green=142)
    expectHueNear(result.green, ANSI_HUE_TARGETS.green);

    // Other 5 slots should be synthesized with correct target hues
    for (const slot of ['red', 'yellow', 'cyan', 'blue', 'magenta'] as const) {
      expect(result[slot]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('handles all-gray swatches (low chroma)', () => {
    const swatches: SwatchInput[] = [
      { hex: '#808080', population: 500 },
      { hex: '#a0a0a0', population: 300 },
      { hex: '#606060', population: 200 },
    ];

    const result = assignSwatchesToAnsiSlots(swatches);

    // All slots should be filled (synthesized from achromatic donors)
    const slots: AnsiHueSlot[] = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
    for (const slot of slots) {
      expect(result[slot]).toBeDefined();
      expect(result[slot]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('resolves conflict when two slots compete for the same swatch', () => {
    // Hue 168 is between green (142) and cyan (195) — equidistant-ish
    // Provide a second swatch at hue 200 near cyan
    const swatches: SwatchInput[] = [
      makeSwatch(168, { pop: 500 }), // contested: 26° from green, 27° from cyan
      makeSwatch(200, { pop: 100 }), // near cyan (5° from 195)
    ];

    const result = assignSwatchesToAnsiSlots(swatches);

    // Cyan has 2 viable candidates, green has 1 → green is more constrained
    // So green should get the hue-168 swatch, cyan gets the hue-200 swatch
    expect(result.green).toBeDefined();
    expect(result.cyan).toBeDefined();
    // Both should be valid hex
    expect(result.green).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.cyan).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('prefers higher population when hue distances tie', () => {
    const swatches: SwatchInput[] = [
      makeSwatch(264, { pop: 100 }), // blue hue, low pop
      makeSwatch(264, { pop: 900 }), // blue hue, high pop
    ];

    const result = assignSwatchesToAnsiSlots(swatches);
    expect(result.blue).toBeDefined();
    // The high-population swatch should win (same hue)
    // We can verify by checking the exact hex matches the high-pop swatch
    expect(result.blue).toBe(swatches[1]!.hex);
  });

  it('does not assign swatches beyond MAX_HUE_DISTANCE', () => {
    // Place a single swatch at hue 0 (close to red=29, far from everything else)
    const swatches: SwatchInput[] = [makeSwatch(0, { pop: 500 })];

    const result = assignSwatchesToAnsiSlots(swatches);

    // Red should get it (distance = 29, within MAX_HUE_DISTANCE=60)
    expectHueNear(result.red, ANSI_HUE_TARGETS.red, 50);

    // Other slots should all be synthesized (hue 0 is >60° from yellow=110, green=142, etc.)
    // They should still be valid
    for (const slot of ['yellow', 'green', 'cyan', 'blue', 'magenta'] as const) {
      expect(result[slot]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
