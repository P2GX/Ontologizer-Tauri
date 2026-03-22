import { Component, SimpleChanges, Input, OnChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { DropdownMenu } from '../../../shared/dropdown-menu/dropdown-menu';
import { Legend } from '../bar-chart/legend/legend';
import { Tooltip } from '../../../shared/tooltip/tooltip';
import { DotData, NodeData } from '../../../services/results-service';
import 'd3-graphviz';
import * as d3 from 'd3';

@Component({
  selector: 'app-go-graph',
  imports: [DropdownMenu, Legend, Tooltip],
  templateUrl: './go-graph.html',
  styleUrl: './go-graph.css'
})
export class GoGraph implements AfterViewInit, OnChanges, OnDestroy {
  @Input() visible: boolean = false;
  @Input() dotData?: DotData | null = null;
  @Input() legendMaxValue: number = 1;
  @Input() isBayesian: boolean = false;

  viewInitialized: boolean = false;

  @ViewChild('MFgraphvizContainer', { static: true }) MFgraphvizContainer!: ElementRef;
  @ViewChild('BPgraphvizContainer', { static: true }) BPgraphvizContainer!: ElementRef;
  @ViewChild('CCgraphvizContainer', { static: true }) CCgraphvizContainer!: ElementRef;

  subgraphs: string[] = ['Molecular Function', 'Biological Process', 'Cellular Component'];
  topNOptions: string[] = ['Significant', 'Top 10', 'Top 25', 'Top 50'];

  showTooltip: boolean = false;
  selectedChart: 'MF' | 'BP' | 'CC' = 'MF';
  selectedTopN: string = 'Significant';

  dotStrings: Record<'BP' | 'MF' | 'CC', string> = { BP: '', MF: '', CC: '' };

  private updateOptionsForMethod(): void {
    this.topNOptions = this.isBayesian
      ? ['Posterior', 'Top 10', 'Top 25', 'Top 50']
      : ['Significant', 'Top 10', 'Top 25', 'Top 50'];
    this.selectedTopN = this.isBayesian ? 'Posterior' : 'Significant';
  }

  selectChart(chart: string) {
    switch (chart) {
      case 'Molecular Function': this.selectedChart = 'MF'; break;
      case 'Biological Process': this.selectedChart = 'BP'; break;
      case 'Cellular Component': this.selectedChart = 'CC'; break;
    }
  }

  selectTopN(option: string) {
    this.selectedTopN = option;
    this.generateDot('MF');
    this.generateDot('BP');
    this.generateDot('CC');
    this.renderGraph('MF');
    this.renderGraph('BP');
    this.renderGraph('CC');
  }

  generateDot(subgraph: 'MF' | 'BP' | 'CC'): void {
    if (!this.dotData) return;

    // 1. Determine seed nodes based on selection
    let seed_nodes: NodeData[];
    if (this.selectedTopN === 'Significant' || this.selectedTopN === 'Posterior') {
      // Use only terms that passed the significance threshold (applied by backend)
      seed_nodes = Object.values(this.dotData[subgraph].nodes.significant);
      seed_nodes.sort((a, b) => this.isBayesian ? b.p_val - a.p_val : a.p_val - b.p_val);
    } else {
      // Top N: pick from ALL tested terms (not just significant ones), sorted by score
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

    let dot = 'digraph {\nrankdir=BT;\nranksep=1.2;\nnodesep=0.5;\n';
    for (const node of [...seed_nodes, ...ancestor_nodes]) {
      const [fillColor, fontColor] = this.pvalToColor(node.p_val);
      const tooltip = `${node.label}<br/>${node.id}<br/>p: ${this.formatPValue(node.p_val)}<br/>Study: ${node.study_count}<br/>Population: ${node.population_count}`;
      const attrs = `label="${node.id}", tooltip="${tooltip}", fillcolor="${fillColor}", style="filled,rounded", fontname="Trebuchet MS", fontcolor="${fontColor}", penwidth=0.8, fixedsize=false, shape=box`;
      dot += `"${node.id}" [${attrs}];\n`;
    }
    for (const edge of edges) {
      dot += `"${edge.source}" -> "${edge.target}";\n`;
    }
    dot += '}\n';
    this.dotStrings[subgraph] = dot;
  }

  formatPValue(p: number): string {
    if (p < 0.001) return p.toExponential(2);
    return p.toFixed(4);
  }

  pvalToColor(score: number): [string, string] {
    const max = this.legendMaxValue;
    const t = max > 0
      ? Math.min(1, Math.max(0, this.isBayesian ? score / max : -Math.log10(score) / max))
      : 0;
    return [this.interpolateGoldToRed(t), '#003754'];
  }

  private interpolateGoldToRed(t: number): string {
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

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.updateOptionsForMethod();
    if (this.dotData) this.renderAll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isBayesian'] && this.viewInitialized) {
      this.updateOptionsForMethod();
    }
    if (changes['dotData'] && this.dotData && this.viewInitialized) {
      this.renderAll();
    }
  }

  private renderAll(): void {
    this.generateDot('MF');
    this.generateDot('BP');
    this.generateDot('CC');
    this.renderGraph('MF');
    this.renderGraph('BP');
    this.renderGraph('CC');
  }

  renderGraph(subgraph: 'MF' | 'BP' | 'CC'): void {
    const container = d3.select(this[`${subgraph}graphvizContainer`].nativeElement) as any;
    container
      .graphviz({ useWorker: false, zoom: true, fit: true })
      .renderDot(this.dotStrings[subgraph])
      .on('end', () => this.setupGraph(container, subgraph));
  }

  setupGraph(container: any, subgraph: 'MF' | 'BP' | 'CC') {
    const svg = container.select('svg');
    svg.attr('width', '100%').attr('height', '100%').style('align', 'center').attr('pad', '20').attr('cursor', 'pointer');
    svg.select('g').select('polygon').attr('fill', 'none').attr('stroke', 'none');

    const nodes = svg.selectAll('g.node');
    nodes.each((d: any, i: number, nodesArray: any) => {
      const node = d3.select(nodesArray[i]);
      const aTag = node.select('g a');
      const title = aTag.attr('title');
      if (title) aTag.attr('data-tooltip', title);
    });
    nodes.selectAll('title').remove();
    svg.select('title').remove();

    this.hoverNodeTooltip(nodes, subgraph);
  }

  hoverNodeTooltip(nodes: any, subgraph: 'MF' | 'BP' | 'CC'): void {
    const containerEl = this[`${subgraph}graphvizContainer`].nativeElement;
    const tooltipRef = d3.select(`#${subgraph}Tooltip`);

    nodes.on('mouseover', (event: any) => {
      d3.select(event.currentTarget).select('polygon, rect').attr('stroke-width', 4);
      const aTag = d3.select(event.currentTarget).select('g a');
      const tooltipText = aTag.attr('data-tooltip');
      aTag.attr('title', null);

      const containerRect = containerEl.getBoundingClientRect();
      const nodeRect = event.currentTarget.getBoundingClientRect();
      tooltipRef
        .style('opacity', 1)
        .style('padding', '4px 8px')
        .html(tooltipText)
        .style('left', (nodeRect.x - containerRect.x + nodeRect.width + 10) + 'px')
        .style('top', (nodeRect.y - containerRect.y) + 'px');
    })
    .on('mouseout', (event: any) => {
      tooltipRef.style('opacity', 0);
      d3.select(event.currentTarget).select('polygon, ellipse, rect').attr('stroke-width', '1');
    });
  }

  ngOnDestroy(): void {
    d3.select(this.MFgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.BPgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.CCgraphvizContainer.nativeElement).selectAll('*').remove();
  }
}
