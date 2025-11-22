import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { TransformedRowData } from '../../../services/analysis-service';
import { Legend } from './legend/legend';
import { DropdownMenu } from '../../../shared/dropdown-menu/dropdown-menu';

@Component({
  selector: 'app-analysis-bar-chart',
  imports: [CommonModule, Legend, DropdownMenu],
  templateUrl: './analysis-bar-chart.html',
  styleUrl: './analysis-bar-chart.css',
  standalone: true

})
export class AnalysisBarChart implements AfterViewInit, OnChanges {

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;
  chart?: Chart;

  @Input() PlotData!: TransformedRowData[] | null;
  significantData: TransformedRowData[] | null = null;
  viewInitialized = false;
  minAdjPval: number = 0;
  maxAdjPval: number = 0;

  plotOptions: string[] = ['-Log10(p.adj)', 'Enrichment ratio', 'Study counts'];
  subgraphs: string[] = ["All", "Molecular Function", "Biological Process", "Cellular Component"];

  selectedPlotOption: string = '-Log10(p.adj)';
  selectedSubgraph: string = 'All';

  selectPlotOption(option: string) {
    this.selectedPlotOption = option;
    this.createChart();
  }

  selectSubgraph(option: string) {
    this.selectedSubgraph = option;
    this.createChart();
  }

  ngAfterViewInit(): void {
    if (this.PlotData) {
      this.significantData = this.PlotData?.filter(row => row.adj_pval <= 0.05) ?? [];
      this.createChart();
    }
    this.viewInitialized = true;

  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PlotData'] && this.PlotData && this.viewInitialized) {
      this.significantData = this.PlotData?.filter(row => row.adj_pval <= 0.05) ?? [];
      this.createChart();
    }
  }

  createChart(): void {

    if (!this.significantData || this.significantData.length === 0) {
      return;
    }
    if (this.chart) {
      this.chart.destroy();
      this.chartDiv.nativeElement.style.width = `100%`;
    }

    const plotOption = this.selectedPlotOption;
    const filteredData = this.selectedSubgraph === 'All' ? this.significantData : this.significantData.filter(row => {
      if (this.selectedSubgraph === 'Molecular Function') return row.aspect === 'MF';
      if (this.selectedSubgraph === 'Biological Process') return row.aspect === 'BP';
      if (this.selectedSubgraph === 'Cellular Component') return row.aspect === 'CC';
      return true;
    });

    const labels = filteredData.map(row => row.term_label);
    console.log('labels count', labels.length);
    const adj_pvals = filteredData.map(row => row.adj_pval);
    const go_ids = filteredData.map(row => row.term_id);
    const backgroundColors = filteredData.map(row => this.pvalToColor(row.adj_pval));

    const yValues: { [key: string]: number[] } = { '-Log10(p.adj)': adj_pvals.map(p => -Math.log10(p)), 'Study counts': filteredData.map(row => row.nt), 'Enrichment ratio': filteredData.map(row => (row.nt / row.n) / (row.mt / row.m)) };

    this.chart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: this.selectedPlotOption,
          data: yValues[plotOption],
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
          y: { beginAtZero: true, title: { display: true, text: this.selectedPlotOption } }
        },
        plugins: {
          tooltip: {
            callbacks: {

              beforeTitle: (context) => {
                const adj_pval = adj_pvals[context[0].dataIndex];
                const go_id = go_ids[context[0].dataIndex];
                return `${go_id}`;
              },
              afterBody: (context) => {
                const adj_pval = adj_pvals[context[0].dataIndex];
                return `Adjusted p-value: ${this.formatPValue(adj_pval)}`;
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

  formatPValue(p: number): string {
    if (p < 0.001) {
      return p.toExponential(2);
    } else {
      return p.toFixed(4);
    }
  }

  pvalToColor(adj_pval: number): string {
    if (adj_pval < 0.000001) return "#800000";
    if (adj_pval < 0.00001) return "#b30000";
    if (adj_pval < 0.0001) return "#e34a33";
    if (adj_pval < 0.001) return "#fc8d59";
    if (adj_pval < 0.01) return "#fcc469ff";
    if (adj_pval <= 0.05) return "#f7dd60ff";

    return "#cccccc"; // fallback: non-significant
  }
}

