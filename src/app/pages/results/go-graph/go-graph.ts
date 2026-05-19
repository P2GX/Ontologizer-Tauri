import { Component, SimpleChanges, Input, Output, EventEmitter, OnChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ChartHeader } from '../../../shared/chart-header/chart-header';
import { DotData, NodeData } from '../../../services/results-service';
import { interpolateSignificanceHex, pickInkForBackground, significanceThresholdT } from '../../../shared/utils/significance-color';
import { wrapLabel } from '../../../shared/utils/wrap-label';
import { TermTooltipData, termTooltipHtml, formatScore } from '../../../shared/utils/term-tooltip';
import { positionTooltip } from '../../../shared/utils/tooltip-position';
import 'd3-graphviz';
import * as d3 from 'd3';

@Component({
  selector: 'app-go-graph',
  imports: [ChartHeader],
  templateUrl: './go-graph.html',
  styleUrl: './go-graph.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoGraph implements AfterViewInit, OnChanges, OnDestroy {
  @Input() visible: boolean = false;
  @Input() dotData?: DotData | null = null;
  @Input() legendMaxValue: number = 1;
  @Input() isBayesian: boolean = false;

  /** Emits a GO term id when the user clicks "Show in Table" inside the
   *  hover tooltip. The parent is expected to switch to the Table tab and
   *  filter the table by that id. */
  @Output() showInTable = new EventEmitter<string>();

  viewInitialized: boolean = false;

  @ViewChild('MFgraphvizContainer', { static: true }) MFgraphvizContainer!: ElementRef;
  @ViewChild('BPgraphvizContainer', { static: true }) BPgraphvizContainer!: ElementRef;
  @ViewChild('CCgraphvizContainer', { static: true }) CCgraphvizContainer!: ElementRef;

  subgraphs: string[] = ['Molecular Function', 'Biological Process', 'Cellular Component'];
  topNOptions: string[] = ['All Significant', 'Top 10', 'Top 25', 'Top 50'];

  private readonly SUBGRAPH_CODES: Record<string, 'MF' | 'BP' | 'CC'> = {
    'Molecular Function': 'MF',
    'Biological Process': 'BP',
    'Cellular Component': 'CC',
  };

  selectedChart: 'MF' | 'BP' | 'CC' = 'MF';
  selectedSubgraph: string = 'Molecular Function';
  selectedTopN: string = 'All Significant';

  dotStrings: Record<'BP' | 'MF' | 'CC', string> = { BP: '', MF: '', CC: '' };
  private renderedAspects: Set<'MF' | 'BP' | 'CC'> = new Set();
  /** d3-graphviz instance per aspect, captured so we can reset the zoom to
   *  the original fit transform when the user re-selects an already-rendered
   *  aspect. d3-zoom otherwise keeps whatever pan/zoom the user last applied. */
  private graphvizInstances: Partial<Record<'MF' | 'BP' | 'CC', any>> = {};
  /** Per-node tooltip data, keyed by GO term id. Populated in generateDot. */
  private nodeTooltips = new Map<string, TermTooltipData>();

  selectChart(chart: string) {
    const code = this.SUBGRAPH_CODES[chart];
    if (!code) return;
    this.selectedSubgraph = chart;
    this.selectedChart = code;
    if (!this.renderedAspects.has(this.selectedChart)) {
      this.generateDot(this.selectedChart);
      this.renderGraph(this.selectedChart);
      this.renderedAspects.add(this.selectedChart);
    } else {
      // Re-center an aspect the user has already viewed — otherwise d3-zoom
      // restores whatever pan/zoom they last applied to it.
      this.graphvizInstances[this.selectedChart]?.resetZoom();
    }
  }

  selectTopN(option: string) {
    this.selectedTopN = option;
    this.renderedAspects.clear();
    this.generateDot(this.selectedChart);
    this.renderGraph(this.selectedChart);
    this.renderedAspects.add(this.selectedChart);
  }

  generateDot(subgraph: 'MF' | 'BP' | 'CC'): void {
    if (!this.dotData) return;

    // 1. Determine seed nodes based on selection
    let seed_nodes: NodeData[];
    if (this.selectedTopN === 'All Significant') {
      // Use only terms that passed the significance threshold (applied by backend)
      seed_nodes = Object.values(this.dotData[subgraph].nodes.significant);
      seed_nodes.sort((a, b) => this.isBayesian ? b.p_val - a.p_val : a.p_val - b.p_val);
    } else {
      // Top N: pick from ALL tested terms (not just All Significant ones), sorted by score
      const all_tested = Object.values(this.dotData[subgraph].nodes.tested);
      all_tested.sort((a, b) => this.isBayesian ? b.p_val - a.p_val : a.p_val - b.p_val);
      const n = this.selectedTopN === 'Top 10' ? 10 : this.selectedTopN === 'Top 25' ? 25 : 50;
      seed_nodes = all_tested.slice(0, n);
    }

    if (seed_nodes.length === 0) {
      this.dotStrings[subgraph] = 'digraph { rankdir=BT; }';
      return;
    }

    // 2. Build node pool from all tested terms (covers seeds and ancestors)
    const nodePool = new Map<string, NodeData>();
    for (const n of Object.values(this.dotData[subgraph].nodes.tested)) nodePool.set(n.id, n);
    for (const n of Object.values(this.dotData[subgraph].nodes.ancestors)) nodePool.set(n.id, n);

    // 3. Build child→parents adjacency from full edge set
    const childToParents = new Map<string, string[]>();
    for (const edge of this.dotData[subgraph].edges.full) {
      if (!childToParents.has(edge.source)) childToParents.set(edge.source, []);
      childToParents.get(edge.source)!.push(edge.target);
    }

    // 4. BFS upward from seeds to collect the correct ancestor set
    const seedIds = new Set(seed_nodes.map(n => n.id));
    const ancestorIds = new Set<string>();
    const queue = Array.from(seedIds);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const parent of childToParents.get(curr) ?? []) {
        if (!seedIds.has(parent) && !ancestorIds.has(parent)) {
          ancestorIds.add(parent);
          queue.push(parent);
        }
      }
    }

    const ancestor_nodes = Array.from(ancestorIds)
      .map(id => nodePool.get(id))
      .filter((n): n is NodeData => n !== undefined);

    // 5. Build DOT string
    const allIds = new Set([...seedIds, ...ancestorIds]);
    const edges = this.dotData[subgraph].edges.full
      .filter(e => allIds.has(e.source) && allIds.has(e.target));

    // Reset tooltip data so stale entries don't survive a re-render.
    this.nodeTooltips.clear();

    let dot = 'digraph {\nrankdir=BT;\nranksep=1.2;\nnodesep=0.5;\n';
    for (const node of [...seed_nodes, ...ancestor_nodes]) {
      const [fillColor, fontColor] = this.pvalToColor(node.p_val);
      this.nodeTooltips.set(node.id, {
        label: node.label,
        id: node.id,
        scoreLabel: this.isBayesian ? 'Posterior' : 'Adj. p-value',
        scoreValue: formatScore(node.p_val),
        studyHits: node.study_count,
        populationHits: this.isBayesian ? undefined : node.population_count,
        showInTableButton: true,
      });
      // Graphviz needs a tooltip attribute so an <a title="..."> is emitted; we
      // park the GO id there and look up the rich tooltip in our Map at hover.
      // Visible label: term name, wrapped to ≤10 chars × 2 lines so nodes stay
      // close to their previous (id-only) footprint.
      const wrapped = wrapLabel(node.label, 10, 2)
          .map((line: string) => line.replace(/\\/g, '\\\\').replace(/"/g, '\"'))
        .join('\\n');
      const attrs = `label="${wrapped}", tooltip="${node.id}", fillcolor="${fillColor}", style="filled,rounded", fontname="Trebuchet MS", fontcolor="${fontColor}", penwidth=0.8, fixedsize=false, shape=box`;
      dot += `"${node.id}" [${attrs}];\n`;
    }
    for (const edge of edges) {
      dot += `"${edge.source}" -> "${edge.target}";\n`;
    }
    dot += '}\n';
    this.dotStrings[subgraph] = dot;
  }

  pvalToColor(score: number): [string, string] {
    const max = this.legendMaxValue;
    const t = max > 0
      ? (this.isBayesian ? score / max : -Math.log10(score) / max)
      : 0;
    const threshold = significanceThresholdT(this.isBayesian, max);
    const fill = interpolateSignificanceHex(t, threshold);
    const ink = pickInkForBackground(fill);
    return [fill, ink];
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.dotData) this.renderAll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dotData'] && this.dotData && this.viewInitialized) {
      this.renderAll();
    }
  }

  private renderAll(): void {
    this.renderedAspects.clear();
    this.generateDot(this.selectedChart);
    this.renderGraph(this.selectedChart);
    this.renderedAspects.add(this.selectedChart);
  }

  renderGraph(subgraph: 'MF' | 'BP' | 'CC'): void {
    const container = d3.select(this[`${subgraph}graphvizContainer`].nativeElement) as any;
    const gv = container.graphviz({ useWorker: false, zoom: true, fit: true });
    this.graphvizInstances[subgraph] = gv;
    gv.renderDot(this.dotStrings[subgraph])
      .on('end', () => {
        this.setupGraph(container, subgraph);
        // d3-graphviz reuses the same instance per container, so a re-render
        // (e.g. after changing Top N) inherits the user's prior d3-zoom
        // transform — `fit: true` only acts on the initial render. Forcing
        // resetZoom here re-centers on every render. Idempotent on first
        // render (already fitted).
        gv.resetZoom();
      });
  }

  setupGraph(container: any, subgraph: 'MF' | 'BP' | 'CC') {
    const svg = container.select('svg');
    svg.attr('width', '100%').attr('height', '100%').style('align', 'center').attr('pad', '20').attr('cursor', 'pointer');
    svg.select('g').select('polygon').attr('fill', 'none').attr('stroke', 'none');

    const nodes = svg.selectAll('g.node');
    nodes.each((_d: any, i: number, nodesArray: any) => {
      const node = d3.select(nodesArray[i]);
      const aTag = node.select('g a');
      const title = aTag.attr('title');
      if (title) aTag.attr('data-tooltip', title);
    });
    nodes.selectAll('title').remove();
    svg.select('title').remove();

    this.hoverNodeTooltip(nodes, subgraph);
  }

  /** Tooltip-hide grace period (ms). Long enough for the user to bridge the
   *  10 px gap between the node and the tooltip when they want to copy text;
   *  short enough that a casual mouse-move doesn't leave stale tooltips. */
  private static readonly TOOLTIP_HIDE_DELAY = 200;

  /** Place the tooltip next to the hovered node, flipping/clamping so it
   *  stays inside the visible tab-panel. Delegates the math to the shared
   *  positioner; this wrapper just resolves the bounds element and feeds the
   *  node's bounding rect as the anchor. */
  private positionTooltipForNode(tooltipRef: any, nodeEl: Element, containerEl: HTMLElement): void {
    const tooltipEl = tooltipRef.node() as HTMLElement | null;
    if (!tooltipEl) return;
    const bounds = (containerEl.closest('.tab-panel') as HTMLElement | null) ?? containerEl;
    positionTooltip(tooltipEl, nodeEl.getBoundingClientRect(), bounds);
  }

  hoverNodeTooltip(nodes: any, subgraph: 'MF' | 'BP' | 'CC'): void {
    const containerEl = this[`${subgraph}graphvizContainer`].nativeElement;
    const tooltipRef = d3.select(`#${subgraph}Tooltip`);

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let currentNode: Element | null = null;

    const cancelHide = () => {
      if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; }
    };

    const scheduleHide = () => {
      cancelHide();
      hideTimer = setTimeout(() => {
        tooltipRef.style('opacity', 0).style('pointer-events', 'none');
        if (currentNode) {
          d3.select(currentNode).select('polygon, ellipse, rect').attr('stroke-width', '1');
          currentNode = null;
        }
        hideTimer = null;
      }, GoGraph.TOOLTIP_HIDE_DELAY);
    };

    nodes.on('mouseover', (event: any) => {
      cancelHide();
      // Hopping directly from one node to another: clear the previous node's
      // highlight before applying the new one (no mouseout reset fires here).
      if (currentNode && currentNode !== event.currentTarget) {
        d3.select(currentNode).select('polygon, ellipse, rect').attr('stroke-width', '1');
      }
      currentNode = event.currentTarget;
      d3.select(event.currentTarget).select('polygon, rect').attr('stroke-width', 4);
      const aTag = d3.select(event.currentTarget).select('g a');
      const nodeId = aTag.attr('data-tooltip');
      aTag.attr('title', null);

      const data = nodeId ? this.nodeTooltips.get(nodeId) : undefined;
      if (!data) return;

      // Render content first so getBoundingClientRect reports its actual size,
      // then flip/clamp inside the visible tab-panel.
      tooltipRef
        .style('opacity', 1)
        .style('pointer-events', 'auto')
        .html(termTooltipHtml(data));
      this.positionTooltipForNode(tooltipRef, event.currentTarget as Element, containerEl);
    })
    .on('mouseout', () => scheduleHide());

    // Tooltip itself is a hover target so the user can move into it (e.g. to
    // select and copy the term name). d3's .on() replaces existing handlers
    // by event name, so repeated renders don't stack listeners.
    tooltipRef
      .on('mouseenter', () => cancelHide())
      .on('mouseleave', () => scheduleHide())
      .on('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const action = target?.closest('[data-action]')?.getAttribute('data-action');
        if (action !== 'show-in-table') return;
        const id = currentNode
          ? d3.select(currentNode).select('g a').attr('data-tooltip')
          : null;
        if (!id) return;
        this.showInTable.emit(id);
        // Dismiss right away — the user has finished with this tooltip; the
        // parent will switch tabs which removes our hover target anyway.
        cancelHide();
        tooltipRef.style('opacity', 0).style('pointer-events', 'none');
        if (currentNode) {
          d3.select(currentNode).select('polygon, ellipse, rect').attr('stroke-width', '1');
          currentNode = null;
        }
      });
  }

  /** Aspect code (MF/BP/CC) of the currently rendered subgraph. */
  get selectedAspectCode(): 'MF' | 'BP' | 'CC' {
    return this.selectedChart;
  }

  /** Returns a base64-encoded PNG of the currently displayed GO subgraph, or
   *  null if nothing is rendered. The Graphviz SVG is cloned, given concrete
   *  pixel dimensions from its viewBox (the live SVG uses 100%/100% which
   *  collapses outside its container), painted on a white background, and
   *  rasterized via Image → canvas. Output is upscaled 2× for crisper text. */
  async exportPng(): Promise<string | null> {
    const containerEl = this[`${this.selectedChart}graphvizContainer`]
      .nativeElement as HTMLElement;
    const liveSvg = containerEl.querySelector('svg');
    if (!liveSvg) return null;

    const clone = liveSvg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    let widthPx = 800;
    let heightPx = 600;
    const viewBox = clone.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every(n => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
        widthPx = parts[2];
        heightPx = parts[3];
      }
    }
    clone.setAttribute('width', String(widthPx));
    clone.setAttribute('height', String(heightPx));

    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load GO graph SVG into image'));
        img.src = url;
      });

      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(widthPx * scale));
      canvas.height = Math.max(1, Math.round(heightPx * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const idx = dataUrl.indexOf(',');
      return idx >= 0 ? dataUrl.substring(idx + 1) : null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  ngOnDestroy(): void {
    for (const key of ['MF', 'BP', 'CC'] as const) {
      d3.select(this[`${key}graphvizContainer`].nativeElement).selectAll('*').remove();
    }
  }
}
