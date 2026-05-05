import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { DashboardInfo } from '../results';
import { CORRECTION_NAMES } from '../../../services/analysis-service';

type Aspect = 'BP' | 'MF' | 'CC';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  @Input() dashboardInfo!: DashboardInfo;

  get isFrequentist(): boolean {
    return this.dashboardInfo?.method?.method === 'Frequentist';
  }

  get methodLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m) return '';
    return m.method === 'Bayesian' ? 'Bayesian Inference' : 'Statistical Testing';
  }

  get correctionLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m || m.method === 'Bayesian') return '';
    return CORRECTION_NAMES[m.correction];
  }

  get parameterRows(): ParameterRow[] {
    const priors = this.dashboardInfo?.bayesianPriors ?? null;
    const posteriors = this.dashboardInfo?.bayesianPosteriors ?? null;
    return [
      { label: 'False positive rate', prior: priors?.alpha ?? null, posterior: posteriors?.alpha ?? null },
      { label: 'False negative rate', prior: priors?.beta ?? null, posterior: posteriors?.beta ?? null },
      { label: 'Term activation probability', prior: priors?.p ?? null, posterior: 'see Table' },
    ];
  }

  /** Two-significant-figure formatter. Switches to scientific notation
   *  (mantissa × 10^exponent, with a unicode-superscripted exponent)
   *  when |value| < 0.01, where leading zeros would dominate the display. */
  formatProb(value: number | string | null | undefined): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined || !isFinite(value)) return '—';
    if (value === 0) return '0';
    const abs = Math.abs(value);
    if (abs >= 0.01) {
      return parseFloat(value.toPrecision(2)).toString();
    }
    const exp = Math.floor(Math.log10(abs));
    const mantissa = parseFloat((value / Math.pow(10, exp)).toPrecision(2)).toString();
    return `${mantissa} × 10${this.toSuperscript(exp)}`;
  }

  private toSuperscript(n: number): string {
    const map: Record<string, string> = {
      '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
      '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    };
    return n.toString().split('').map(c => map[c] ?? c).join('');
  }

  get significantTotal(): number {
    return this.dashboardInfo?.results.significant ?? 0;
  }

  get testedTotal(): number {
    return this.dashboardInfo?.results.total ?? 0;
  }

  format(n: number): string {
    return n.toLocaleString('de-DE');
  }

  aspectSignificant(aspect: Aspect): number {
    return this.dashboardInfo?.results.proportionData[aspect]?.significant ?? 0;
  }

  aspectShare(aspect: Aspect): string {
    const sig = this.aspectSignificant(aspect);
    const total = this.significantTotal;
    if (total === 0) return '—';
    const pct = Math.round((sig / total) * 100);
    return `${this.format(sig)} / ${this.format(total)} (${pct}%)`;
  }
}

export interface ParameterRow {
  label: string;
  prior: number | null;
  posterior: number | string | null;
}
