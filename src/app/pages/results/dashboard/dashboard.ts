import { Component, Input, OnChanges, OnDestroy, AfterViewInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { DashboardInfo } from '../results';
import { RowData } from '../../../services/results-service';
import { BACKGROUND_NAMES, CORRECTION_NAMES } from '../../../services/analysis-service';

interface DonutConfig {
  title: string;
  labels: string[];
  colors: string[];
  data: number[];
}

const FONT = 'Trebuchet MS, Trebuchet, sans-serif';
const COLOR = '#003754';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  standalone: true,
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnChanges, AfterViewInit, OnDestroy {

  @ViewChild('chartA') chartContainerA!: ElementRef<HTMLDivElement>;
  @ViewChild('chartB') chartContainerB!: ElementRef<HTMLDivElement>;

  @Input() dashboardInfo!: DashboardInfo;
  @Input() pValueData: RowData[] | null = null;
  @Input() visible: boolean = false;
  viewInitialized: boolean = false;

  private pendingDraw: ReturnType<typeof setTimeout> | null = null;

  get isFrequentist(): boolean {
    return this.dashboardInfo?.method?.method === 'Frequentist';
  }

  get methodLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m) return '';
    return m.method === 'Bayesian' ? 'Inference' : 'Testing';
  }

  get backgroundLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m || m.method === 'Bayesian') return '';
    return BACKGROUND_NAMES[m.background];
  }

  get correctionLabel(): string {
    const m = this.dashboardInfo?.method;
    if (!m || m.method === 'Bayesian') return '';
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
    this.redrawCharts(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) return;

    if (changes['visible'] && this.visible) {
      if (this.pendingDraw !== null) clearTimeout(this.pendingDraw);
      this.pendingDraw = setTimeout(() => { this.pendingDraw = null; this.redrawCharts(); });
      return;
    }

    if (changes['dashboardInfo'] || changes['pValueData']) {
      this.redrawCharts(true);
    }
  }

  ngOnDestroy(): void {
    if (this.pendingDraw !== null) clearTimeout(this.pendingDraw);
  }

  private redrawCharts(updateData = false): void {
    if (updateData) this.updateChartData();
    this.drawDistributionChart();
    this.drawChart('B');
  }

  // --- D3 style helpers ---

  private styleText(
    sel: d3.Selection<SVGTextElement, unknown, null, undefined>,
    size: string,
    bold = false
  ): d3.Selection<SVGTextElement, unknown, null, undefined> {
    return sel
      .attr('font-family', FONT)
      .attr('font-size', size)
      .attr('fill', COLOR)
      .attr('font-weight', bold ? 'bold' : null);
  }

  private styleAxisGroup(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    g.selectAll<SVGTextElement, unknown>('text')
      .attr('font-family', FONT)
      .attr('font-size', '11px')
      .attr('fill', COLOR);
  }

  // --- Charts ---

  private drawDistributionChart(): void {
    const containerEl = this.chartContainerA?.nativeElement;
    if (!containerEl) return;

    d3.select(containerEl).selectAll('*').remove();

    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    if (width === 0 || height === 0) return;

    const data = this.pValueData;
    if (!data || data.length === 0) return;

    const top = data.slice(0, 100);
    const values = this.isFrequentist
      ? top.map(d => (d.score > 0 ? -Math.log10(d.score) : 0))
      : top.map(d => d.score);
    const maxVal = Math.max(...values);

    const M = { top: 8, right: 12, bottom: 36, left: 46 };
    const chartW = width - M.left - M.right;
    const chartH = height - M.top - M.bottom;

    const svg = d3.select<HTMLDivElement, unknown>(containerEl)
      .append<SVGSVGElement>('svg')
      .attr('width', width)
      .attr('height', height);


    const g = svg.append<SVGGElement>('g').attr('transform', `translate(${M.left},${M.top})`);

    const n = top.length;
    const pointSpacing = chartW / n;

    const yScale = d3.scaleLinear()
      .domain([0, maxVal])
      .range([chartH, 0])
      .nice();

    const niceMax = yScale.domain()[1];
    const step = d3.tickStep(0, niceMax, 5);
    const yTickVals = d3.range(0, niceMax + step * 0.01, step);

    const areaGen = d3.area<number>()
      .x((_, i) => i * pointSpacing + pointSpacing / 2)
      .y0(chartH)
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const lineGen = d3.line<number>()
      .x((_, i) => i * pointSpacing + pointSpacing / 2)
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(values).attr('d', areaGen).attr('fill', '#9D7220').attr('opacity', 0.25);
    g.append('path').datum(values).attr('d', lineGen).attr('fill', 'none').attr('stroke', '#9D7220').attr('stroke-width', 2);

    // Y-axis
    const yAxisG = g.append<SVGGElement>('g').call(d3.axisLeft(yScale).tickValues(yTickVals).tickSize(0));
    yAxisG.select('.domain').remove();
    this.styleAxisGroup(yAxisG);

    this.styleText(
      g.append<SVGTextElement>('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle'),
      '11px'
    ).text(this.isFrequentist ? '-log₁₀(p)' : 'Posterior');

    // X-axis
    const xScale = d3.scaleLinear().domain([0, n]).range([0, chartW]);
    const xAxisG = g.append<SVGGElement>('g')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(xScale).tickValues(d3.range(10, n + 1, 10)).tickFormat(d => String(d)).tickSize(3));
    xAxisG.select('.domain').remove();
    this.styleAxisGroup(xAxisG);

    this.styleText(
      g.append<SVGTextElement>('text').attr('x', chartW / 2).attr('y', chartH + 30).attr('text-anchor', 'middle'),
      '11px'
    ).text('Rank');
  }

  private drawChart(type: 'A' | 'B'): void {
    const containerEl = (type === 'A' ? this.chartContainerA : this.chartContainerB)?.nativeElement;
    if (!containerEl) return;

    const config = this.chartConfigs[type];
    d3.select(containerEl).selectAll('*').remove();

    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    if (width === 0 || height === 0) return;

    const M = 16;
    const total = config.data.reduce((a, b) => a + b, 0);

    const svg = d3.select<HTMLDivElement, unknown>(containerEl)
      .append<SVGSVGElement>('svg')
      .attr('width', width)
      .attr('height', height);

    const chartHeight = height;
    const legendWidth = 155;
    const donutAreaWidth = width - legendWidth;
    const radius = Math.min(donutAreaWidth * 0.8, chartHeight * 0.8) / 2;
    const innerRadius = radius * 0.55;

    const tooltip = d3.select(containerEl).append('div').attr('class', 'chart-tooltip');

    type SliceData = { label: string; value: number; color: string };
    const slices: SliceData[] = config.labels.map((label, i) => ({
      label, value: config.data[i], color: config.colors[i]
    }));

    const pie = d3.pie<SliceData>().sort(null).value(d => d.value);
    const arcGen = d3.arc<d3.PieArcDatum<SliceData>>().innerRadius(innerRadius).outerRadius(radius);
    const arcHover = d3.arc<d3.PieArcDatum<SliceData>>().innerRadius(innerRadius).outerRadius(radius + 5);

    svg.append('g')
      .attr('transform', `translate(${legendWidth + donutAreaWidth / 2}, ${chartHeight / 2})`)
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
        tooltip.style('left', (event.clientX - rect.left + 14) + 'px').style('top', (event.clientY - rect.top - 14) + 'px');
      })
      .on('mouseout', function(_, d) {
        d3.select(this).attr('d', arcGen(d)!);
        tooltip.classed('visible', false);
      });

    const legendItemHeight = 22;
    const legendTotalHeight = config.labels.length * legendItemHeight;
    const legendG = svg.append<SVGGElement>('g')
      .attr('transform', `translate(${M}, ${(chartHeight - legendTotalHeight) / 2})`);

    config.labels.forEach((label, i) => {
      const row = legendG.append('g').attr('transform', `translate(0, ${i * legendItemHeight})`);
      row.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', config.colors[i]);
      this.styleText(
        row.append<SVGTextElement>('text').attr('x', 18).attr('y', 10),
        '12px'
      ).text(label);
    });
  }
}
