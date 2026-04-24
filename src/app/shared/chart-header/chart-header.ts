import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { ScopeSelector } from '../scope-selector/scope-selector';
import { Legend } from '../../pages/results/bar-chart/legend/legend';

@Component({
  selector: 'app-chart-header',
  imports: [ScopeSelector, Legend],
  templateUrl: './chart-header.html',
  styleUrl: './chart-header.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartHeader {
  @Input() isBayesian = false;
  @Input() legendMaxValue = 1;

  // Scope selector
  @Input() sizeOptions: string[] = [];
  @Input() selectedSize = '';
  @Input() aspectOptions: string[] = [];
  @Input() selectedAspect = '';
  @Output() sizeChange = new EventEmitter<string>();
  @Output() aspectChange = new EventEmitter<string>();

  // Statistic segmented control — null hides it (Bayesian mode / GO-graph)
  @Input() statisticOptions: string[] | null = null;
  @Input() selectedStatistic: string | null = null;
  @Input() statisticDisplayNames: Record<string, string> = {};
  @Output() statisticChange = new EventEmitter<string>();

  labelOf(opt: string): string {
    return this.statisticDisplayNames[opt] ?? opt;
  }
}
