import { Component, Input, OnChanges, OnDestroy, AfterViewInit, SimpleChanges, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
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
const COLOR_SIG = '#9D7220';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  standalone: true,
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnChanges, AfterViewInit, OnDestroy {

  @ViewChild('chartA') chartContainerA!: ElementRef<HTMLDivElement>;
  @ViewChild('chartB') chartContainerB!: ElementRef<HTMLDivElement>;

  @Input() dashboardInfo!: DashboardInfo;
  @Input() pValueData: RowData[] | null = null;
  @Input() visible: boolean = false;
  viewInitialized: boolean = false;

  private pendingDraw: ReturnType<typeof setTimeout> | null = null;
  // Unique per-instance ID avoids SVG defs collisions if Angular ever keeps
  // two instances in the DOM simultaneously (e.g. during route transitions)
  private readonly distGradId = `dist-strip-grad-${Math.random().toString(36).slice(2)}`;

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
    this.drawDonutChart();
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

    // Map each term onto a shared "significance" axis: higher x = more significant
    const threshold = this.isFrequentist ? -Math.log10(0.05) : 0.5;
    const toX = (score: number): number =>
      this.isFrequentist ? (score > 0 ? -Math.log10(score) : 0) : score;
    const isSig = (score: number): boolean =>
      this.isFrequentist ? score <= 0.05 : score >= 0.5;

    type Pt = { x: number; sig: boolean; i: number };
    const points: Pt[] = data.map((d, i) => ({ x: toX(d.score), sig: isSig(d.score), i }));
    const sigPts = points.filter(p => p.sig);

    // Cap the fog at 2 000 dots — visual density is identical beyond this count
    // and it prevents frame-rate collapse on large datasets (40 000+ terms)
    const MAX_FOG = 2000;
    const allNonSig = points.filter(p => !p.sig);
    const fogPts = allNonSig.length > MAX_FOG
      ? allNonSig.filter((_, i) => i % Math.ceil(allNonSig.length / MAX_FOG) === 0)
      : allNonSig;

    const maxScore = points.reduce((m, p) => Math.max(m, p.x), 0);
    // Always show the threshold line even when no term clears it
    const xMax = Math.max(maxScore, threshold * 1.18);

    const M = { top: 22, right: 14, bottom: 22, left: 14 };
    const W = width - M.left - M.right;
    const H = height - M.top - M.bottom;
    const stripH = Math.min(H * 0.45, 30);
    const cy = H / 2;

    const svg = d3.select<HTMLDivElement, unknown>(containerEl)
      .append<SVGSVGElement>('svg')
      .attr('width', width)
      .attr('height', height)
      // Screen-reader summary of what the chart shows
      .attr('role', 'img')
      .attr('aria-label',
        `Score distribution: ${sigPts.length.toLocaleString('de-DE')} of ` +
        `${points.length.toLocaleString('de-DE')} terms are significant`);

    // Horizontal gradient: barely-there on the left (low scores), slightly more
    // solid on the right (high scores) — subtly reinforces direction
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', this.distGradId)
      .attr('x1', '0%').attr('x2', '100%')
      .attr('y1', '0%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', COLOR).attr('stop-opacity', 0.03);
    grad.append('stop').attr('offset', '100%').attr('stop-color', COLOR).attr('stop-opacity', 0.08);

    const g = svg.append<SVGGElement>('g').attr('transform', `translate(${M.left},${M.top})`);
    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, W]);

    // Pill-shaped strip background
    g.append('rect')
      .attr('x', 0).attr('y', cy - stripH / 2)
      .attr('width', W).attr('height', stripH)
      .attr('rx', stripH / 2)
      .attr('fill', `url(#${this.distGradId})`);

    // Deterministic y-jitter — sin-hash keeps every dot in the same spot
    // on re-renders without needing to store per-point positions
    const jitter = (i: number): number =>
      (((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1 - 0.5) * (stripH - 6);

    // Non-significant fog: additive transparency creates density from overlapping dots
    g.selectAll<SVGCircleElement, Pt>('.ns-dot')
      .data(fogPts)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => cy + jitter(d.i))
      .attr('r', 1.5)
      .attr('fill', COLOR)
      .attr('opacity', 0.09);

    // Soft glow halo behind each significant dot — radiates outward from the pill
    g.selectAll<SVGCircleElement, Pt>('.sig-glow')
      .data(sigPts)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => cy + jitter(d.i))
      .attr('r', 7)
      .attr('fill', COLOR_SIG)
      .attr('opacity', 0.18);

    // Significant dots — prominent gold, clearly distinguishable from the fog
    g.selectAll<SVGCircleElement, Pt>('.sig-dot')
      .data(sigPts)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => cy + jitter(d.i))
      .attr('r', 3)
      .attr('fill', COLOR_SIG);

    // Threshold divider
    const tx = xScale(threshold);
    g.append('line')
      .attr('x1', tx).attr('x2', tx)
      .attr('y1', cy - stripH / 2 - 8)
      .attr('y2', cy + stripH / 2 + 4)
      .attr('stroke', COLOR).attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3').attr('opacity', 0.28);

    // Labels anchor to the less-crowded side of the threshold line;
    // clamped so they never spill outside the SVG bounds
    const anchor = tx > W * 0.72 ? 'end' : 'start';
    const lx = Math.max(6, Math.min(W - 6, anchor === 'start' ? tx + 5 : tx - 5));

    // Threshold label — above the divider
    this.styleText(
      g.append<SVGTextElement>('text')
        .attr('x', lx).attr('y', cy - stripH / 2 - 11)
        .attr('text-anchor', anchor),
      '10px'
    ).attr('opacity', 0.38)
      .text(this.isFrequentist ? 'p = 0.05' : 'Post. ≥ 0.5');

    // Count label — below the divider; gold when terms are significant, muted otherwise
    this.styleText(
      g.append<SVGTextElement>('text')
        .attr('x', lx).attr('y', cy + stripH / 2 + 16)
        .attr('text-anchor', anchor),
      '10px'
    ).attr('fill', sigPts.length > 0 ? COLOR_SIG : COLOR)
      .attr('opacity', sigPts.length > 0 ? 0.9 : 0.35)
      .text(`${sigPts.length.toLocaleString('de-DE')} significant`);

    // Directional hint — anchored well inside the chart area to avoid clipping
    this.styleText(
      g.append<SVGTextElement>('text')
        .attr('x', W).attr('y', H - 4)
        .attr('text-anchor', 'end'),
      '10px'
    ).attr('opacity', 0.25).text('more significant →');
  }

  private drawDonutChart(): void {
    const containerEl = this.chartContainerB?.nativeElement;
    if (!containerEl) return;

    const config = this.chartConfigs['B'];
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
