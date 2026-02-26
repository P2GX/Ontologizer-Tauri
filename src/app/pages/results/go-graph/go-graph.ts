import { Component, SimpleChanges, Input, OnChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { DropdownMenu } from '../../../shared/dropdown-menu/dropdown-menu';
import { Legend } from '../analysis-bar-chart/legend/legend';
import { Tooltip } from '../../../shared/tooltip/tooltip';
import { DotData } from '../../../services/analysis-service';
// import * as Viz from "@viz-js/viz";
import 'd3-graphviz';
import * as d3 from 'd3';

@Component({
  selector: 'app-go-graph',
  imports: [CommonModule, DropdownMenu, Legend, Tooltip],
  templateUrl: './go-graph.html',
  styleUrl: './go-graph.css'
})

export class GoGraph implements AfterViewInit, OnChanges, OnDestroy {
  @Input() visible: boolean = false;
  @Input() dotData?: DotData | null = null;
  viewInitialized: boolean = false;

  @ViewChild('MFgraphvizContainer', { static: true }) MFgraphvizContainer!: ElementRef;
  @ViewChild('BPgraphvizContainer', { static: true }) BPgraphvizContainer!: ElementRef;
  @ViewChild('CCgraphvizContainer', { static: true }) CCgraphvizContainer!: ElementRef;
  @ViewChild('MFgraphvizContainerFull', { static: true }) MFgraphvizContainerFull!: ElementRef;
  @ViewChild('BPgraphvizContainerFull', { static: true }) BPgraphvizContainerFull!: ElementRef;
  @ViewChild('CCgraphvizContainerFull', { static: true }) CCgraphvizContainerFull!: ElementRef;

  subgraphs: string[] = ["Molecular Function", "Biological Process", "Cellular Component"];
  showTooltip: boolean = false;
  showNonSignificant: boolean = false;

  selectedChart: 'MF' | 'BP' | 'CC' = 'MF';

  dotStrings = {
    BP: { compressed: '', full: '' },
    MF: { compressed: '', full: '' },
    CC: { compressed: '', full: '' }
  }

  toggleExpanded() {
    this.showNonSignificant = !this.showNonSignificant;
  }

  generateDot(subgraph: 'MF' | 'BP' | 'CC'): void {
    let compressed_dot = "digraph {\n";
    compressed_dot += "rankdir=BT;\n";
    compressed_dot += "ranksep=1.2;\n";
    compressed_dot += "nodesep=0.5;\n";

    let full_dot = "digraph {\n";
    full_dot += "rankdir=BT;\n";
    full_dot += "ranksep=1.2;\n";
    full_dot += "nodesep=0.5;\n";

    if (this.dotData) {
      let edges_compressed = this.dotData[subgraph].edges.compressed;
      let edges_full = this.dotData[subgraph].edges.full;
      let significant_nodes = Object.values(this.dotData[subgraph].nodes.significant);
      let all_nodes = [
        ...significant_nodes,
        ...Object.values(this.dotData[subgraph].nodes.ancestors)
      ];


      // generate compressed dot string
      for (const node of significant_nodes) {
        const [fillColor, fontColor] = this.pvalToColor(node.p_val);
        compressed_dot += `"${node.id}" [label="${this.wrapLabel(node.label, 15)}", tooltip="${node.id} <br/> p.adj: ${this.formatPValue(node.p_val)}<br/> Study annotations: ${node.study_count}<br/> Population annotations: ${node.population_count}<br/> actual depth: ${node.depth}", fillcolor="${fillColor}", style=filled, fontname="Arial", fontcolor="${fontColor}", fixedsize=false, shape=box];\n`;
      }

      for (const edge of edges_compressed) {
        const style = edge.nodes_skipped === 0 ? "solid" : "dashed";
        compressed_dot += `"${edge.source}" -> "${edge.target}" [style=${style}];\n`;
      }

      compressed_dot += "}\n";

      // generate full dot string starting from most specific significant nodes
      for (const node of all_nodes) {
        const [fillColor, fontColor] = this.pvalToColor(node.p_val);
        full_dot += `"${node.id}" [label="${this.wrapLabel(node.label, 15)}", tooltip="${node.id} <br/> p.adj: ${this.formatPValue(node.p_val)}<br/> Study annotations: ${node.study_count}<br/> Population annotations: ${node.population_count}<br/> actual depth: ${node.depth}", fillcolor="${fillColor}", style=filled, fontname="Arial", fontcolor="${fontColor}", fixedsize=false, shape=box];\n`;
      }

      for (const edge of edges_full) {
        const style = edge.nodes_skipped === 0 ? "solid" : "dashed";
        full_dot += `"${edge.source}" -> "${edge.target}" [style=${style}];\n`;
      }
      full_dot += "}\n";

      this.dotStrings[subgraph] = { compressed: compressed_dot, full: full_dot };

    }
  }

  formatPValue(p: number): string {
    if (p < 0.001) {
      return p.toExponential(2);
    } else {
      return p.toFixed(4);
    }
  }

  pvalToColor(adj_pval: number): [string, string] {
    if (adj_pval < 0.000001) return ["#800000", "#ffffff"];
    if (adj_pval < 0.00001) return ["#b30000", "#ffffff"];
    if (adj_pval < 0.0001) return ["#e34a33", "#ffffff"];
    if (adj_pval < 0.001) return ["#fc8d59", "black"];
    if (adj_pval < 0.01) return ["#fcc469ff", "black"];
    if (adj_pval <= 0.05) return ["#f7dd60ff", "black"];

    return ["#fefefeff", "#505050"]; // fallback: non-significant
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
    this.generateDot('MF');
    this.generateDot('BP');
    this.generateDot('CC');
    this.createGraphviz('MF');
    this.createGraphviz('BP');
    this.createGraphviz('CC');
  }

  selectChart(chart: string) {

    switch (chart) {
      case 'Molecular Function':
        this.selectedChart = 'MF';
        break;
      case 'Biological Process':
        this.selectedChart = 'BP';
        break;
      case 'Cellular Component':
        this.selectedChart = 'CC';
        break;
    }

  }

  wrapLabel(text: string, maxChars: number): string {
    const individual_words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of individual_words) {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine.length + 1 + word.length) <= maxChars) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);

    return lines.join("\\n");
  }

  createGraphviz(subgraph: 'MF' | 'BP' | 'CC'): void {
    const containerCompressed = d3.select(this[`${subgraph}graphvizContainer`].nativeElement) as any;
    const containerFull = d3.select(this[`${subgraph}graphvizContainerFull`].nativeElement) as any;

    const dotCompressed = this.dotStrings[subgraph].compressed;
    const dotFull = this.dotStrings[subgraph].full;

    // Compressed Graph
    containerCompressed
      .graphviz({ useWorker: false, zoom: true, fit: true })
      .renderDot(dotCompressed)
      .on('end', () => this.setupGraph(containerCompressed, subgraph, true));

    // Full Graph starting from most specific significant nodes
    containerFull
      .graphviz({ useWorker: false, zoom: true, fit: true })
      .renderDot(dotFull)
      .on('end', () => this.setupGraph(containerFull, subgraph, false));
  }

  setupGraph(container: any, subgraph: 'MF' | 'BP' | 'CC', compressed: boolean) {
    const svg = container.select('svg');
    svg.attr('width', '100%').attr('height', '100%').style('align', 'center').attr('pad', '20').attr('cursor', 'pointer');

    const nodes = svg.selectAll('g.node');
    nodes.each((d: any, i: number, nodesArray: any) => {
      const node = d3.select(nodesArray[i]);
      const aTag = node.select('g a');
      const title = aTag.attr('title');
      if (title) aTag.attr('data-tooltip', title);
    });
    nodes.selectAll('title').remove();
    svg.select('title').remove();

    // Tooltip
    this.HoverNodeTooltip(nodes, subgraph, compressed);
  }


  HoverNodeTooltip(nodes: any, subgraph: 'MF' | 'BP' | 'CC', compressed: boolean = true): void {
    nodes.on('mouseover', (event: any) => {
      console.log('mouseover', event.currentTarget);
      const current_node = event.currentTarget;

      d3.select(event.currentTarget)
        .select("polygon, rect")
        .attr("stroke-width", 4);

      const aTag = d3.select(current_node).select('g a');
      const tooltipText = aTag.attr('data-tooltip');
      aTag.attr('title', null); // Verhindert den Standard-Browser-Tooltip
      if (compressed) {

      }
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

  ngOnDestroy(): void {
    // Clean up any resources or subscriptions here if needed
    d3.select(this.MFgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.BPgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.CCgraphvizContainer.nativeElement).selectAll('*').remove();
    d3.select(this.MFgraphvizContainerFull.nativeElement).selectAll('*').remove();
    d3.select(this.BPgraphvizContainerFull.nativeElement).selectAll('*').remove();
    d3.select(this.CCgraphvizContainerFull.nativeElement).selectAll('*').remove();
  }

}
