// Random category color generator — not a small fixed swatch list, but not
// fully random RGB either (that produces muddy/clashing colors on a dark
// theme). Instead, hue is fully random (so shades/variety are effectively
// unlimited) while saturation/lightness are bounded to the same vivid,
// legible-on-dark band the app's own accent tokens live in (cyan/magenta/
// amber in globals.css sit around L 0.62–0.78, fairly high chroma) — so
// every generated color still reads as "this app's palette," just a
// different hue.
const SATURATION_RANGE: [number, number] = [65, 95]; // %
const LIGHTNESS_RANGE: [number, number] = [55, 72]; // %

function randomInRange([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

// Standard HSL -> hex conversion (no extra dependency needed).
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) =>
    Math.round(f(n) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

export function randomCategoryColor(): string {
  const hue = Math.random() * 360;
  const saturation = randomInRange(SATURATION_RANGE);
  const lightness = randomInRange(LIGHTNESS_RANGE);
  return hslToHex(hue, saturation, lightness);
}

// Deterministic per-label color, not random — the same label always
// resolves to the same color across renders/reloads, without needing an
// actual color field to persist anywhere. Used for Schedule commitments,
// which have no color of their own but still benefit from being visually
// distinguishable ("Work" always reads as the same color, "Gym" another).
// Saturation/lightness fixed (not randomized) rather than ranged, purely so
// two different labels that happen to hash to a similar hue don't also
// drift apart in vividness — keeps the whole set visually consistent.
export function hashLabelToColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0; // force a 32-bit int, keeps this stable across runs
  }
  const hue = Math.abs(hash) % 360;
  return hslToHex(hue, 75, 65);
}
