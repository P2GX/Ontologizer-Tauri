import { Component, Input, OnChanges, AfterViewInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { DashboardInfo } from '../results';
import { TOPOLOGY_NAMES, CORRECTION_NAMES } from '../../../services/analysis-service';

interface DonutConfig {
  title: string;
  labels: string[];
  colors: string[];
  data: number[];
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  standalone: true,
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnChanges, AfterViewInit {

  @ViewChild('chartA') chartContainerA!: ElementRef<HTMLDivElement>;
  @ViewChild('chartB') chartContainerB!: ElementRef<HTMLDivElement>;

  @Input() dashboardInfo!: DashboardInfo;
  @Input() visible: boolean = false;
  viewInitialized: boolean = false;

  get isFrequentist(): boolean {
    return this.dashboardInfo?.method?.method === 'frequentist';
  }

  get methodLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m) return '';
    if (m.method === 'bayesian') return 'Inference';
    else return 'Testing';
  }

  get backgroundLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m) return '';
    if (m.method === 'bayesian') return '';
    return TOPOLOGY_NAMES[m.topology];
  }

  get correctionLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m || m.method === 'bayesian') return '';
    return CORRECTION_NAMES[m.correction];
  }

  private chartConfigs: Record<'A' | 'B', DonutConfig> = {
    A: {
      title: 'GO Terms',
      labels: ['Significant', 'Non-Significant'],
      colors: ['#9D7220', '#FBDDDC'],
      data: [0, 0]
    },
    B: {
      title: 'Significant Terms by GO Category',
      labels: ['Biological Process', 'Molecular Function', 'Cellular Component'],
      colors: ['#003754', '#009AA9', '#7876B6'],
      data: [0, 0, 0]
    }
  };

  private updateChartData(): void {
    const newData = this.dashboardInfo?.proportionData;
    this.chartConfigs.A.data = newData
      ? [newData.total.significant, newData.total.nonSignificant]
      : [0, 0];
    this.chartConfigs.B.data = newData
      ? [newData.BP.significant, newData.MF.significant, newData.CC.significant]
      : [0, 0, 0];
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.updateChartData();
    this.drawChart('A');
    this.drawChart('B');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) return;

    if (changes['visible'] && this.visible) {
      setTimeout(() => {
        this.drawChart('A');
        this.drawChart('B');
      });
      return;
    }

    if (changes['dashboardInfo']) {
      this.updateChartData();
      this.drawChart('A');
      this.drawChart('B');
    }
  }

  private drawChart(type: 'A' | 'B'): void {
    const containerEl = (type === 'A' ? this.chartContainerA : this.chartContainerB)?.nativeElement;
    if (!containerEl) return;

    const config = this.chartConfigs[type];
    d3.select(containerEl).selectAll('*').remove();

    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    if (width === 0 || height === 0) return;

    const M = 16; // internal margin
    const total = config.data.reduce((a, b) => a + b, 0);

    const svg = d3.select(containerEl).append('svg')
      .attr('width', width)
      .attr('height', height);

    // Title
    svg.append('text')
      .attr('x', M)
      .attr('y', M + 12)
      .attr('font-family', 'Trebuchet MS, Trebuchet, sans-serif')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', '#003754')
      .text(config.title);

    // Chart area below title
    const titleHeight = M + 12 + 12; // top margin + font size + gap
    const chartHeight = height - titleHeight;
    const legendWidth = 155;
    const donutAreaWidth = width - legendWidth;
    const radius = Math.min(donutAreaWidth * 0.8, chartHeight * 0.8) / 2;
    const innerRadius = radius * 0.55;
    const cx = legendWidth + donutAreaWidth / 2;
    const cy = titleHeight + chartHeight / 2;

    // Tooltip
    const tooltip = d3.select(containerEl).append('div')
      .attr('class', 'chart-tooltip');

    // Arcs
    type SliceData = { label: string; value: number; color: string };
    const slices: SliceData[] = config.labels.map((label, i) => ({
      label, value: config.data[i], color: config.colors[i]
    }));

    const pie = d3.pie<SliceData>().sort(null).value(d => d.value);
    const arcGen = d3.arc<d3.PieArcDatum<SliceData>>()
      .innerRadius(innerRadius).outerRadius(radius);
    const arcHover = d3.arc<d3.PieArcDatum<SliceData>>()
      .innerRadius(innerRadius).outerRadius(radius + 5);

    svg.append('g')
      .attr('transform', `translate(${cx}, ${cy})`)
      .selectAll('path')
      .data(pie(slices))
      .join('path')
      .attr('d', d => arcGen(d)!)
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function(_, d) {
        d3.select(this).attr('d', arcHover(d)!);
        const pct = total > 0 ? (d.data.value / total * 100).toFixed(1) : '0.0';
        tooltip.classed('visible', true)
          .html(`<strong>${d.data.label}</strong><br>${d.data.value.toLocaleString('de-DE')} (${pct}%)`);
      })
      .on('mousemove', function(event: MouseEvent) {
        const rect = containerEl.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - rect.left + 14) + 'px')
          .style('top', (event.clientY - rect.top - 14) + 'px');
      })
      .on('mouseout', function(_, d) {
        d3.select(this).attr('d', arcGen(d)!);
        tooltip.classed('visible', false);
      });

    // Legend (vertically centered in chart area)
    const legendItemHeight = 22;
    const legendTotalHeight = config.labels.length * legendItemHeight;
    const legendG = svg.append('g')
      .attr('transform', `translate(${M}, ${titleHeight + (chartHeight - legendTotalHeight) / 2})`);

    config.labels.forEach((label, i) => {
      const row = legendG.append('g').attr('transform', `translate(0, ${i * legendItemHeight})`);
      row.append('rect')
        .attr('width', 12).attr('height', 12)
        .attr('rx', 2).attr('fill', config.colors[i]);
      row.append('text')
        .attr('x', 18).attr('y', 10)
        .attr('font-family', 'Trebuchet MS, Trebuchet, sans-serif')
        .attr('font-size', '12px')
        .attr('fill', '#003754')
        .text(label);
    });
  }
}
