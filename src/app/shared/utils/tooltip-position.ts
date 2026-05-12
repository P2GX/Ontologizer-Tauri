/**
 * Place an absolutely-positioned tooltip next to an `anchor` rectangle so it
 * stays inside `boundsEl`'s visible rect — typically the `.tab-panel` that
 * clips overflow. The tooltip's content must already be in the DOM so its
 * dimensions can be measured.
 *
 * Preferred placement is to the right of the anchor with a `margin` gap,
 * top-aligned with the anchor's top. If that would clip the right edge of
 * `boundsEl`, the tooltip flips to the anchor's left. Vertical overflow is
 * clamped against the bounds' top and bottom (with a `pad` of breathing
 * room from the edges). When the tooltip is wider than the surrounding
 * space on both sides, the right edge takes priority.
 *
 * Coordinates are computed in viewport space and converted back to the
 * tooltip's `offsetParent` for the inline `left` / `top` style values, so
 * the caller doesn't need to know which positioned ancestor the tooltip
 * sits in.
 */
export function positionTooltip(
  tooltipEl: HTMLElement,
  anchor: { left: number; top: number; right: number; bottom: number },
  boundsEl: HTMLElement,
  options?: { margin?: number; pad?: number },
): void {
  const margin = options?.margin ?? 10;
  const pad = options?.pad ?? 4;

  const boundsRect = boundsEl.getBoundingClientRect();
  const offsetParent = (tooltipEl.offsetParent as HTMLElement | null) ?? boundsEl;
  const opRect = offsetParent.getBoundingClientRect();
  const tt = tooltipEl.getBoundingClientRect();

  let leftV = anchor.right + margin;
  let topV = anchor.top;

  if (leftV + tt.width > boundsRect.right - pad) {
    const flipped = anchor.left - margin - tt.width;
    leftV = flipped >= boundsRect.left + pad
      ? flipped
      : Math.max(boundsRect.left + pad, boundsRect.right - pad - tt.width);
  }

  if (topV + tt.height > boundsRect.bottom - pad) {
    topV = boundsRect.bottom - pad - tt.height;
  }
  if (topV < boundsRect.top + pad) {
    topV = boundsRect.top + pad;
  }

  tooltipEl.style.left = `${leftV - opRect.left}px`;
  tooltipEl.style.top = `${topV - opRect.top}px`;
}
