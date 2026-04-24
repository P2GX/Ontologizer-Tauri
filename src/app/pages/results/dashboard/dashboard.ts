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
