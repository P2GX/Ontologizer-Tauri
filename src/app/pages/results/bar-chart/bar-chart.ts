import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import Chart from 'chart.js/auto';
import { RowData, FrequentistRowData } from '../../../services/results-service';
import { ChartHeader } from '../../../shared/chart-header/chart-header';
import { interpolateSignificance, significanceThresholdT } from '../../../shared/utils/significance-color';
import { termTooltipHtml, formatScore } from '../../../shared/utils/term-tooltip';
import { wrapLabel } from '../../../shared/utils/wrap-label';

/**
 * Chart.js global defaults so charts speak the project's typography and color
 * vocabulary. Set once at module load; applies to every chart this app renders.
 * Tokens are resolved at runtime so dark/light theme changes (if any) propagate.
 */
function applyChartDefaults() {
    const css = getComputedStyle(document.documentElement);
    Chart.defaults.font.family = "'Trebuchet MS', Trebuchet, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = css.getPropertyValue('--md-sys-color-primary').trim() || '#003754';
    Chart.defaults.borderColor = css.getPropertyValue('--md-sys-color-outline').trim() || '#D9E1E5';
}
applyChartDefaults();

@Component({
  selector: 'app-bar-chart',
  imports: [ChartHeader],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChart implements AfterViewInit, OnChanges {

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;
  chart?: Chart;

  @Input() PlotData!: RowData[] | null;
  @Input() isBayesian: boolean = false;
  @Input() legendMaxValue: number = 1;

  viewInitialized = false;

  plotOptions: string[] = ['-Log10(p)', 'Enrichment ratio', 'Study count'];
  readonly plotDisplayNames: Record<string, string> = {
    '-Log10(p)': '−Log p-value',
    'Enrichment ratio': 'Enrichment ratio',
    'Study count': 'Count'
  };
  subgraphs: string[] = ['All', 'Molecular Function', 'Biological Process', 'Cellular Component'];

  selectedPlotOption = '-Log10(p)';
  selectedSubgraph = 'All';
  selectedTopN = 'Significant';

  /** Layout constants for canvas auto-width when there are many bars. */
  private static readonly BAR_WIDTH = 10;
  private static readonly BAR_GAP = 8;
  private static readonly AXIS_AND_PADDING = 200;
  private static readonly NO_GROW_THRESHOLD = 30;

  /** The rows currently rendered. Used by the external tooltip handler. */
  private currentRows: RowData[] = [];

  get topNOptions(): string[] {
    const base = ['Top 10', 'Top 25', 'Top 50'];
    return this.isBayesian ? base : ['Significant', ...base];
  }

  /** Whether the current filter selection produces any rows to plot. */
  get hasData(): boolean {
    return this.getDisplayData().length > 0;
  }

  selectPlotOption(option: string) {
    this.selectedPlotOption = option;
    this.createChart();
  }

  selectSubgraph(option: string) {
    this.selectedSubgraph = option;
    this.createChart();
  }

  selectTopN(option: string) {
    this.selectedTopN = option;
    this.createChart();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.PlotData && this.PlotData.length > 0) {
      this.createChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isBayesian'] && changes['isBayesian'].isFirstChange()) {
      this.selectedTopN = this.isBayesian ? 'Top 25' : 'Significant';
    }
    if (changes['PlotData'] && this.PlotData && this.viewInitialized) {
      this.createChart();
    }
  }

  private getDisplayData(): RowData[] {
    if (!this.PlotData) return [];

    let data = this.selectedSubgraph === 'All'
      ? [...this.PlotData]
      : this.PlotData.filter(row => {
          if (this.selectedSubgraph === 'Molecular Function') return row.aspect === 'MF';
          if (this.selectedSubgraph === 'Biological Process') return row.aspect === 'BP';
          if (this.selectedSubgraph === 'Cellular Component') return row.aspect === 'CC';
          return true;
        });

    data = this.isBayesian
      ? data.sort((a, b) => b.score - a.score)
      : data.sort((a, b) => a.score - b.score);

    if (this.selectedTopN === 'Significant') {
      return data.filter(row => row.score <= 0.05);
    }
    const n = parseInt(this.selectedTopN.replace('Top ', ''), 10);
    return data.slice(0, n);
  }

  createChart(): void {
    const displayData = this.getDisplayData();

    if (displayData.length === 0) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
      }
      return;
    }

    if (this.chart) {
      this.chart.destroy();
      this.chartDiv.nativeElement.style.width = '100%';
    }

    this.currentRows = displayData;

    const labels = displayData.map(row => wrapLabel(row.label, 15, 1));
    const backgroundColors = displayData.map(row =>
      this.isBayesian ? this.postProbToColor(row.score) : this.pvalToColor(row.score)
    );

    let yData: number[];
    if (this.isBayesian) {
      yData = displayData.map(row => row.score);
    } else {
      const yValues: Record<string, number[]> = {
        '-Log10(p)': displayData.map(r => -Math.log10(r.score)),
        'Enrichment ratio': displayData.map(r => {
          const f = r as FrequentistRowData;
          return (f.k / f.n) / (f.K / f.N);
        }),
        'Study count': displayData.map(r => (r as FrequentistRowData).k)
      };
      yData = yValues[this.selectedPlotOption] ?? yValues['-Log10(p)'];
    }

    const yAxisLabel = this.isBayesian ? 'Posterior probability' : (this.plotDisplayNames[this.selectedPlotOption] ?? this.selectedPlotOption);

    const css = getComputedStyle(document.documentElement);
    const tokenInk    = css.getPropertyValue('--md-sys-color-primary').trim() || '#003754';
    const tokenLine   = css.getPropertyValue('--md-sys-color-outline').trim() || '#D9E1E5';

    this.chart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: yAxisLabel,
          data: yData,
          borderWidth: 1,
          barThickness: BarChart.BAR_WIDTH,
          backgroundColor: backgroundColors,
          borderColor: tokenLine
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { maxRotation: 45, minRotation: 45 },
            grid: { color: tokenLine }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: yAxisLabel, color: tokenInk, font: { weight: 600 } },
            grid: { color: tokenLine }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (ctx) => this.renderExternalTooltip(ctx),
          }
        }
      }
    });

    if (labels.length > BarChart.NO_GROW_THRESHOLD) {
      const newWidth =
        labels.length * (BarChart.BAR_WIDTH + BarChart.BAR_GAP) + BarChart.AXIS_AND_PADDING;
      this.chartDiv.nativeElement.style.width = `${newWidth}px`;
    }
  }

  /**
   * Chart.js external tooltip handler. Renders the shared `.term-tooltip`
   * markup into a positioned div inside the chart's parent, so the bar plot
   * and the GO graph speak the same hover vocabulary.
   */
  private renderExternalTooltip(context: { chart: Chart; tooltip: any }): void {
    const { chart, tooltip } = context;
    const parent = chart.canvas.parentNode as HTMLElement | null;
    if (!parent) return;

    let el = parent.querySelector<HTMLDivElement>('.term-tooltip-host');
    if (!el) {
      el = document.createElement('div');
      el.className = 'term-tooltip term-tooltip-host';
      el.style.position = 'absolute';
      el.style.pointerEvents = 'none';
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.15s ease';
      el.style.zIndex = '10';
      parent.appendChild(el);
    }

    if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
      el.style.opacity = '0';
      return;
    }

    const dataIndex = tooltip.dataPoints[0].dataIndex as number;
    const row = this.currentRows[dataIndex];
    if (!row) {
      el.style.opacity = '0';
      return;
    }

    const studyHits = this.isBayesian
      ? row.associatedGenes.length
      : (row as FrequentistRowData).k;
    const populationHits = this.isBayesian
      ? undefined
      : (row as FrequentistRowData).K;

    el.innerHTML = termTooltipHtml({
      label: row.label,
      id: row.id,
      scoreLabel: this.isBayesian ? 'Posterior' : 'Adj. p-value',
      scoreValue: formatScore(row.score),
      studyHits,
      populationHits,
    });

    // Place to the right of the bar; flip to the left if it would overflow the chart canvas.
    const margin = 12;
    let left = tooltip.caretX + margin;
    if (left + el.offsetWidth > chart.canvas.width) {
      left = tooltip.caretX - el.offsetWidth - margin;
    }
    el.style.left = `${Math.max(0, left)}px`;
    el.style.top = `${tooltip.caretY}px`;
    el.style.opacity = '1';
  }

  /** Returns a base64-encoded PNG of the current bar chart, or null if no
   *  chart is rendered. Composites onto a white background — Chart.js canvases
   *  are transparent by default, which looks broken when opened standalone. */
  exportPng(): string | null {
    if (!this.chart) return null;
    const src = this.chart.canvas;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    const dataUrl = out.toDataURL('image/png');
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.substring(idx + 1) : null;
  }

  pvalToColor(adj_pval: number): string {
    const max = this.legendMaxValue;
    if (max <= 0) return interpolateSignificance(0);
    const threshold = significanceThresholdT(false, max);
    return interpolateSignificance(-Math.log10(adj_pval) / max, threshold);
  }

  postProbToColor(post_prob: number): string {
    const max = this.legendMaxValue;
    if (max <= 0) return interpolateSignificance(0);
    const threshold = significanceThresholdT(true, max);
    return interpolateSignificance(post_prob / max, threshold);
  }
}
