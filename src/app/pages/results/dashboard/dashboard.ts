import { Component, Input, OnChanges, AfterViewInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js';
import { DashboardInfo } from '../results';
import { TOPOLOGY_NAMES, CORRECTION_NAMES } from '../../../services/analysis-service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  standalone: true,
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnChanges, AfterViewInit {

  @ViewChild('DoughnutChartA') doughnutCanvasA!: ElementRef<HTMLCanvasElement>;
  @ViewChild('DoughnutChartB') doughnutCanvasB!: ElementRef<HTMLCanvasElement>;

  chartA?: Chart;
  chartB?: Chart;

  @Input() dashboardInfo!: DashboardInfo;
  @Input() visible: boolean = false;
  viewInitialized: boolean = false;
  showTooltip: boolean = false;

  get isFrequentist(): boolean {
    return this.dashboardInfo?.method?.method === 'frequentist';
  }

  get methodLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m) return '';
    if (m.method === 'bayesian') return 'Inference';
    return TOPOLOGY_NAMES[m.topology];
  }

  get correctionLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m || m.method === 'bayesian') return '';
    return CORRECTION_NAMES[m.correction];
  }

  doughnutChartProperties = {
    'A': { title: 'Proportion of Significant vs. Non-Significant GO Terms', labels: ['Non-Significant', 'Significant'], backgroundColors: ['#b5b0eaff', 'rgb(255, 99, 132)'], data: [0, 0] },
    'B': { title: 'Proportion of significant terms by GO category', labels: ['Biological Process', 'Molecular Function', 'Cellular Component'], backgroundColors: ['#4bc0c0ff', '#ffcd56ff', '#639cffff'], data: [0, 0, 0] }
  }

  private updateChartData(): void {
    const newData = this.dashboardInfo?.proportionData;
    this.doughnutChartProperties.A.data = newData
      ? [newData.total.nonSignificant, newData.total.significant]
      : [0, 0];
    this.doughnutChartProperties.B.data = newData
      ? [newData.BP.significant, newData.MF.significant, newData.CC.significant]
      : [0, 0, 0];
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.updateChartData();
    this.createChart('A', this.doughnutChartProperties.A.data);
    this.createChart('B', this.doughnutChartProperties.B.data);
    // this.createBarPlot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) return;

    if (changes['visible'] && this.visible) {
      this.chartA?.resize();
      this.chartB?.resize();
      return;
    }

    if (changes['dashboardInfo']) {
      this.updateChartData();
      this.createChart('A', this.doughnutChartProperties.A.data);
      this.createChart('B', this.doughnutChartProperties.B.data);
    }
  }


  createChart(type: 'A' | 'B', data: number[]): void {

    const chartKey = `chart${type}` as 'chartA' | 'chartB';
    const canvasKey = `doughnutCanvas${type}` as 'doughnutCanvasA' | 'doughnutCanvasB';

    if (this[chartKey]) {
      this[chartKey]!.destroy();
    }
    this[chartKey] = new Chart(this[canvasKey].nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.doughnutChartProperties[type].labels,
        datasets: [{
          data: data,
          backgroundColor: this.doughnutChartProperties[type].backgroundColors,
          hoverOffset: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            position: 'top',
            font: {
              family: 'roboto, Arial, Helvetica',
              weight: 'bold'
            },
            align: 'start',
            padding: { top: 0, bottom: 10 },
            text: this.doughnutChartProperties[type].title,
          },
          legend: {
            display: true,
            position: 'left',
            align: 'end',
            labels: {
              font: {
                family: 'roboto, Arial, Helvetica'
              }
            }
          },
          tooltip: {
            callbacks: {
              afterBody: (context) => {
                const count = context[0].parsed;
                if (type === 'A') {
                  const percentage = (count / this.dashboardInfo.resultsLength * 100).toFixed(1);
                  return `${percentage}% of total (${this.dashboardInfo.resultsLength})`;
                } else {
                  const percentage = (count / this.dashboardInfo.proportionData.total.significant * 100).toFixed(1);
                  return `${percentage}% of total (${this.dashboardInfo.proportionData.total.significant})`;
                }
              }
            }
          }
        }
      }
    });
  }

}