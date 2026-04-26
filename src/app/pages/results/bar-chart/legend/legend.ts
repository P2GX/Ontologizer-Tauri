import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-legend',
  imports: [],
  templateUrl: './legend.html',
  styleUrl: './legend.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Legend {
  @Input() maxValue: number = 6;
  @Input() isBayesian: boolean = false;

  /** Significance threshold expressed as a percentage along the colorbar.
   *  Returns null when the threshold falls outside the bar's range. */
  get thresholdPercent(): number | null {
    if (this.isBayesian) {
      if (this.maxValue <= 0.5) return null;
      return (0.5 / this.maxValue) * 100;
    }
    const t = -Math.log10(0.05) / this.maxValue;
    if (t > 1 || t < 0) return null;
    return t * 100;
  }

  /** CSS gradient string honoring the threshold: flat gray below, gradient above. */
  get gradientStyle(): string {
    const t = this.thresholdPercent;
    const stop = t !== null ? t : 0;
    return `linear-gradient(to right,` +
      ` var(--md-sys-color-outline) 0%,` +
      ` var(--md-sys-color-outline) ${stop}%,` +
      ` var(--md-sys-color-success) 100%)`;
  }

  get maxLabel(): string {
    const v = this.maxValue;
    return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
  }
}
