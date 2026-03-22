import { Component, SimpleChanges, Input, OnChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { DropdownMenu } from '../../../shared/dropdown-menu/dropdown-menu';
import { Legend } from '../bar-chart/legend/legend';
import { Tooltip } from '../../../shared/tooltip/tooltip';
import { DotData } from '../../../services/results-service';
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
  @ViewChild('MFgraphvizContainerFull', { static: true }) MFgraphvizContainerFull!: ElementRef;
  @ViewChild('BPgraphvizContainerFull', { static: true }) BPgraphvizContainerFull!: ElementRef;
  @ViewChild('CCgraphvizContainerFull', { static: true }) CCgraphvizContainerFull!: ElementRef;

  subgraphs: string[] = ['Molecular Function', 'Biological Process', 'Cellular Component'];
  topNOptions: string[] = ['Significant', 'Top 10', 'Top 25', 'Top 50', 'Top 100'];

  showTooltip: boolean = false;
  showNonSignificant: boolean = false;
  fullGraphsRendered: boolean = false;

  selectedChart: 'MF' | 'BP' | 'CC' = 'MF';
  selectedTopN: string = 'Significant';

  dotStrings = {
    BP: { compressed: '', full: '' },
    MF: { compressed: '', full: '' },
    CC: { compressed: '', full: '' }
  };

  toggleExpanded() {
    this.showNonSignificant = !this.showNonSignificant;
    if (this.showNonSignificant && !this.fullGraphsRendered) {
      this.fullGraphsRendered = true;
      setTimeout(() => {
        this.renderFull('MF');
        this.renderFull('BP');
        this.renderFull('CC');
      }, 0);
    }
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
    this.renderCompressed('MF');
    this.renderCompressed('BP');
    this.renderCompressed('CC');
    if (this.showNonSignificant) {
      setTimeout(() => {
        this.renderFull('MF');
        this.renderFull('BP');
        this.renderFull('CC');
      }, 0);
    } else {
      this.fullGraphsRendered = false;
    }
  }

  generateDot(subgraph: 'MF' | 'BP' | 'CC'): void {
    if (!this.dotData) return;

    let significant_nodes = Object.values(this.dotData[subgraph].nodes.significant);

    // Sort by significance: frequentist = ascending p-value, bayesian = descending posterior prob
    significant_nodes.sort((a, b) =>
      this.isBayesian ? b.p_val - a.p_val : a.p_val - b.p_val
    );

    // Apply top-N filter
    if (this.selectedTopN !== 'Significant') {
      const n = parseInt(this.selectedTopN.replace('Top ', ''), 10);
      significant_nodes = significant_nodes.slice(0, n);
    }

    const significantIds = new Set(significant_nodes.map(nd => nd.id));
    const ancestor_nodes = Object.values(this.dotData[subgraph].nodes.ancestors);
    const all_nodes = [...significant_nodes, ...ancestor_nodes];
    const allIds = new Set(all_nodes.map(nd => nd.id));

    const edges_compressed = this.dotData[subgraph].edges.compressed
      .filter(e => significantIds.has(e.source) && significantIds.has(e.target));
    const edges_full = this.dotData[subgraph].edges.full
      .filter(e => allIds.has(e.source) && allIds.has(e.target));

    let compressed_dot = 'digraph {\nrankdir=BT;\nranksep=1.2;\nnodesep=0.5;\n';
    let full_dot = 'digraph {\nrankdir=BT;\nranksep=1.2;\nnodesep=0.5;\n';

    for (const node of significant_nodes) {
      const [fillColor, fontColor] = this.pvalToColor(node.p_val);
      const tooltip = `${node.label} <br/> ${node.id} <br/> p: ${this.formatPValue(node.p_val)}<br/> Study: ${node.study_count}<br/> Population: ${node.population_count}`;
      const attrs = `label="${this.wrapLabel(node.label, 15)}", tooltip="${tooltip}", fillcolor="${fillColor}", style="filled,rounded", fontname="Trebuchet MS", fontcolor="${fontColor}", penwidth=0.8, fixedsize=false, shape=box`;
      compressed_dot += `"${node.id}" [${attrs}];\n`;
    }
    for (const edge of edges_compressed) {
      compressed_dot += `"${edge.source}" -> "${edge.target}" [style=${edge.nodes_skipped === 0 ? 'solid' : 'dashed'}];\n`;
    }
    compressed_dot += '}\n';

    for (const node of all_nodes) {
      const [fillColor, fontColor] = this.pvalToColor(node.p_val);
      const tooltip = `${node.id} <br/> p: ${this.formatPValue(node.p_val)}<br/> Study: ${node.study_count}<br/> Population: ${node.population_count}`;
      const attrs = `label="${this.wrapLabel(node.label, 15)}", tooltip="${tooltip}", fillcolor="${fillColor}", style="filled,rounded", fontname="Trebuchet MS", fontcolor="${fontColor}", penwidth=0.8, fixedsize=false, shape=box`;
      full_dot += `"${node.id}" [${attrs}];\n`;
    }
    for (const edge of edges_full) {
      full_dot += `"${edge.source}" -> "${edge.target}" [style=${edge.nodes_skipped === 0 ? 'solid' : 'dashed'}];\n`;
    }
    full_dot += '}\n';

    this.dotStrings[subgraph] = { compressed: compressed_dot, full: full_dot };
  }

  formatPValue(p: number): string {
    if (p < 0.001) return p.toExponential(2);
    return p.toFixed(4);
  }

  pvalToColor(score: number): [string, string] {
    const max = this.legendMaxValue;
    // Frequentist: t = -log10(p) / max   (lower p → higher t → darker)
    // Bayesian:    t = post_prob / max    (higher prob → higher t → darker)
    const t = max > 0
      ? Math.min(1, Math.max(0, this.isBayesian ? score / max : -Math.log10(score) / max))
      : 0;
    const fill = this.interpolateGoldToRed(t);
    const fontColor = '#003754';
    return [fill, fontColor];
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

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.dotData) {
      this.renderAll();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dotData'] && this.dotData && this.viewInitialized) {
      this.renderAll();
    }
  }

  private renderAll(): void {
    this.fullGraphsRendered = false;
    this.generateDot('MF');
    this.generateDot('BP');
    this.generateDot('CC');
    this.renderCompressed('MF');
    this.renderCompressed('BP');
    this.renderCompressed('CC');
  }

  renderCompressed(subgraph: 'MF' | 'BP' | 'CC'): void {
    const container = d3.select(this[`${subgraph}graphvizContainer`].nativeElement) as any;
    container
      .graphviz({ useWorker: false, zoom: true, fit: true })
      .renderDot(this.dotStrings[subgraph].compressed)
      .on('end', () => this.setupGraph(container, subgraph, true));
  }

  renderFull(subgraph: 'MF' | 'BP' | 'CC'): void {
    const container = d3.select(this[`${subgraph}graphvizContainerFull`].nativeElement) as any;
    container
      .graphviz({ useWorker: false, zoom: true, fit: true })
      .renderDot(this.dotStrings[subgraph].full)
      .on('end', () => this.setupGraph(container, subgraph, false));
  }

  setupGraph(container: any, subgraph: 'MF' | 'BP' | 'CC', compressed: boolean) {
    const svg = container.select('svg');
    svg.attr('width', '100%').attr('height', '100%').style('align', 'center').attr('pad', '20').attr('cursor', 'pointer');

    // Remove the white background polygon graphviz injects
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

    this.HoverNodeTooltip(nodes, subgraph, compressed);
  }

  HoverNodeTooltip(nodes: any, subgraph: 'MF' | 'BP' | 'CC', compressed: boolean = true): void {
    nodes.on('mouseover', (event: any) => {
      const current_node = event.currentTarget;

      d3.select(event.currentTarget)
        .select('polygon, rect')
        .attr('stroke-width', 4);

      const aTag = d3.select(current_node).select('g a');
      const tooltipText = aTag.attr('data-tooltip');
      aTag.attr('title', null);

      let containerRect = this[`${subgraph}graphvizContainer`].nativeElement.getBoundingClientRect();
      let tooltipRef = d3.select(`#${subgraph}Tooltip`);
      if (!compressed) {
        containerRect = this[`${subgraph}graphvizContainerFull`].nativeElement.getBoundingClientRect();
        tooltipRef = d3.select(`#${subgraph}TooltipFull`);
      }
      const nodeRect = current_node.getBoundingClientRect();
      const left = nodeRect.x - containerRect.x + nodeRect.width + 10;
      const top = nodeRect.y - containerRect.y;

      tooltipRef
        .style('opacity', 1)
        .style('padding', '4px 8px')
        .html(tooltipText)
        .style('left', left + 'px')
        .style('top', top + 'px');
    })
      .on('mouseout', (event: any) => {
        let tooltipRef = d3.select(`#${subgraph}Tooltip`);
        if (!compressed) {
          tooltipRef = d3.select(`#${subgraph}TooltipFull`);
        }
        tooltipRef.style('opacity', 0);

        d3.select(event.currentTarget)
          .select('polygon, ellipse, rect')
          .attr('stroke-width', '1');
      });
  }

  wrapLabel(text: string, maxChars: number): string {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.join('\\n');
  }

  ngOnDestroy(): void {
    d3.select(this.MFgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.BPgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.CCgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.MFgraphvizContainerFull.nativeElement).selectAll('*').remove();
    d3.select(this.BPgraphvizContainerFull.nativeElement).selectAll('*').remove();
    d3.select(this.CCgraphvizContainerFull.nativeElement).selectAll('*').remove();
  }
}
