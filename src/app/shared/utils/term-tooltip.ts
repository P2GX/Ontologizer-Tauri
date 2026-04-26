/**
 * Single source of truth for the hover tooltip shown on a GO term, both in
 * the Bar Plot (Chart.js external mode) and the GO Graph (custom DOM).
 *
 * The HTML structure is consumed by `.term-tooltip` styles in styles.scss.
 */

export interface TermTooltipData {
  label: string;
  id: string;
  /** Display label for the score row, e.g. "Adj. p-value" or "Posterior". */
  scoreLabel: string;
  /** Pre-formatted score string (caller decides scientific vs fixed). */
  scoreValue: string;
  studyHits: number;
  /** Frequentist only. Omit for Bayesian rows. */
  populationHits?: number;
}

export function formatScore(value: number): string {
  if (value < 0.001) return value.toExponential(2);
  return value.toFixed(4);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

export function termTooltipHtml(d: TermTooltipData): string {
  const popRow = d.populationHits !== undefined
    ? `<div class="term-tooltip-row">
         <span class="term-tooltip-key">Population hits</span>
         <span class="term-tooltip-value">${d.populationHits}</span>
       </div>`
    : '';
  return `
    <div class="term-tooltip-name">${escapeHtml(d.label)}</div>
    <div class="term-tooltip-id">${escapeHtml(d.id)}</div>
    <div class="term-tooltip-divider" aria-hidden="true"></div>
    <div class="term-tooltip-rows">
      <div class="term-tooltip-row">
        <span class="term-tooltip-key">${escapeHtml(d.scoreLabel)}</span>
        <span class="term-tooltip-value">${escapeHtml(d.scoreValue)}</span>
      </div>
      <div class="term-tooltip-row">
        <span class="term-tooltip-key">Study hits</span>
        <span class="term-tooltip-value">${d.studyHits}</span>
      </div>
      ${popRow}
    </div>
  `;
}
