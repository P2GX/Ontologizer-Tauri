/**
 * Single source of truth for the significance color scale used by bar-chart
 * and go-graph. Resolves CSS variable values at call time so the JS-rendered
 * scale always matches the legend gradient declared in legend.css.
 *
 * Scale: --md-sys-color-outline (low / non-significant)
 *      → --md-sys-color-success (high / most significant).
 *
 * When `threshold` is provided (in t-space, 0..1), every value below the
 * threshold maps to the low stop unchanged, and the gradient only begins
 * above the threshold. This keeps non-significant terms visually quiet.
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  if (h.length === 6) {
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return [0, 0, 0];
}

function readToken(name: string, fallback: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return hexToRgb(raw || fallback);
}

/** Position of the significance threshold along the legend, in t-space (0..1). */
export function significanceThresholdT(isBayesian: boolean, maxValue: number): number {
  if (maxValue <= 0) return 1;
  if (isBayesian) {
    if (maxValue <= 0.5) return 1;
    return 0.5 / maxValue;
  }
  const t = -Math.log10(0.05) / maxValue;
  return Math.min(1, Math.max(0, t));
}

/** Linear blend between outline (t=0 or below threshold) and success (t=1). Returns `rgb(...)`. */
export function interpolateSignificance(t: number, threshold = 0): string {
  const clamped = Math.min(1, Math.max(0, t));
  const low  = readToken('--md-sys-color-outline', '#D9E1E5');
  const high = readToken('--md-sys-color-success', '#9D7220');
  if (clamped <= threshold || threshold >= 1) {
    return `rgb(${low[0]}, ${low[1]}, ${low[2]})`;
  }
  const s = (clamped - threshold) / (1 - threshold);
  const r = Math.round(low[0] + (high[0] - low[0]) * s);
  const g = Math.round(low[1] + (high[1] - low[1]) * s);
  const b = Math.round(low[2] + (high[2] - low[2]) * s);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Pick a readable ink color for a given fill. Returns `--md-sys-color-on-primary`
 * (light) when the fill is dark enough that `--md-sys-color-primary` ink would
 * fail WCAG AA, otherwise returns the standard primary ink.
 */
export function pickInkForBackground(fillHex: string): string {
  const [r, g, b] = hexToRgb(fillHex);
  const srgbToLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
  const styles = getComputedStyle(document.documentElement);
  const dark  = styles.getPropertyValue('--md-sys-color-primary').trim() || '#003754';
  const light = styles.getPropertyValue('--md-sys-color-on-primary').trim() || '#ffffff';
  // Threshold ~0.45 keeps mid-gold fills on light ink rather than dark navy.
  return luminance < 0.45 ? light : dark;
}

/** As `interpolateSignificance` but returns `#rrggbb`, useful for Graphviz. */
export function interpolateSignificanceHex(t: number, threshold = 0): string {
  const clamped = Math.min(1, Math.max(0, t));
  const low  = readToken('--md-sys-color-outline', '#D9E1E5');
  const high = readToken('--md-sys-color-success', '#9D7220');
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  if (clamped <= threshold || threshold >= 1) {
    return `#${toHex(low[0])}${toHex(low[1])}${toHex(low[2])}`;
  }
  const s = (clamped - threshold) / (1 - threshold);
  const r = Math.round(low[0] + (high[0] - low[0]) * s);
  const g = Math.round(low[1] + (high[1] - low[1]) * s);
  const b = Math.round(low[2] + (high[2] - low[2]) * s);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
