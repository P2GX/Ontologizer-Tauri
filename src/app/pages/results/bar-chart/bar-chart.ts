import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { RowData, FrequentistRowData } from '../../../services/results-service';
import { Legend } from './legend/legend';
import { DropdownMenu } from '../../../shared/dropdown-menu/dropdown-menu';

@Component({
  selector: 'app-bar-chart',
  imports: [Legend, DropdownMenu],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
  standalone: true
})
export class BarChart implements AfterViewInit, OnChanges {

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;
  chart?: Chart;

  @Input() PlotData!: RowData[] | null;
  @Input() isBayesian: boolean = false;
  @Input() legendMaxValue: number = 1;

  viewInitialized = false;

  plotOptions: string[] = ['-Log10(p)', 'Enrichment ratio', 'Study counts'];
  subgraphs: string[] = ['All', 'Molecular Function', 'Biological Process', 'Cellular Component'];

  selectedPlotOption = '-Log10(p)';
  selectedSubgraph = 'All';
  selectedTopN = 'Significant';

  get topNOptions(): string[] {
    const base = ['Top 10', 'Top 25', 'Top 50'];
    return this.isBayesian ? base : ['Significant', ...base];
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

    const labels = displayData.map(row => row.label);
    const backgroundColors = displayData.map(row =>
      this.isBayesian ? this.postProbToColor(row.score) : this.pvalToColor(row.score)
    );

    let yData: number[];
    if (this.isBayesian) {
      yData = displayData.map(row => row.score);
    } else {
      const yValues: Record<string, number[]> = {
        '-Log10(p.adj)': displayData.map(r => -Math.log10(r.score)),
        'Enrichment ratio': displayData.map(r => {
          const f = r as FrequentistRowData;
          return (f.k / f.n) / (f.K / f.N);
        }),
        'Study counts': displayData.map(r => (r as FrequentistRowData).k)
      };
      yData = yValues[this.selectedPlotOption] ?? yValues['-Log10(p.adj)'];
    }

    const yAxisLabel = this.isBayesian ? 'Posterior Probability' : this.selectedPlotOption;

    this.chart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: yAxisLabel,
          data: yData,
          borderWidth: 1,
          barThickness: 10,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: yAxisLabel } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterBody: (context) => {
                const row = displayData[context[0].dataIndex];
                if (this.isBayesian) {
                  return `Posterior Probability: ${this.formatScore(row.score)}`;
                }
                return `Adj. p-value: ${this.formatScore(row.score)}`;
              }
            }
          }
        }
      }
    });

    if (labels.length > 30) {
      const newWidth = 1830 + ((labels.length - 30) * 10);
      this.chartDiv.nativeElement.style.width = `${newWidth}px`;
    }
  }

  formatScore(value: number): string {
    if (value < 0.001) return value.toExponential(2);
    return value.toFixed(4);
  }

  pvalToColor(adj_pval: number): string {
    const max = this.legendMaxValue;
    if (max <= 0) return '#FFFFFF';
    const t = Math.min(1, Math.max(0, -Math.log10(adj_pval) / max));
    return this.interpolateGoldToRed(t);
  }

  postProbToColor(post_prob: number): string {
    const max = this.legendMaxValue;
    if (max <= 0) return '#FFFFFF';
    const t = Math.min(1, Math.max(0, post_prob / max));
    return this.interpolateGoldToRed(t);
  }

  private interpolateGoldToRed(t: number): string {
    // 3-stop gradient matching legend: white #FFFFFF → light pink #FBDDDC → gold #9D7220
    let r: number, g: number, b: number;
    if (t <= 0.5) {
      const s = t * 2;
      r = Math.round(0xFF + (0xFB - 0xFF) * s);
      g = Math.round(0xFF + (0xDD - 0xFF) * s);
      b = Math.round(0xFF + (0xDC - 0xFF) * s);
    } else {
      const s = (t - 0.5) * 2;
      r = Math.round(0xFB + (0x9D - 0xFB) * s);
      g = Math.round(0xDD + (0x72 - 0xDD) * s);
      b = Math.round(0xDC + (0x20 - 0xDC) * s);
    }
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
