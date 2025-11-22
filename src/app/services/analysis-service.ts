import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  constructor() { }

  async runAnalysis() {
    try {
      // Call the Tauri command to start the analysis
      await invoke<void>('run_analysis');
    } catch (error) {
      console.error('Error running analysis:', error);
      this.tableData = null;
      this.dotData = null;
      throw error;
    }
  }

  private tableData: TransformedRowData[] | null = null;
  private dotData: DotData | null = null;
  private mtcMethod: string = '';
  private analysisMethod: string = '';
  private significantCount: number = 0;
  private resultsLength: number = 0;
  private proportionData: ProportionData = {
    total: { nonSignificant: 0, significant: 0 },
    BP: { nonSignificant: 0, significant: 0 },
    MF: { nonSignificant: 0, significant: 0 },
    CC: { nonSignificant: 0, significant: 0 }
  };

  async loadDotData() {
    try {
      const data = await invoke<DotData>('build_go_graph_data');
      this.dotData = { BP: data.BP, MF: data.MF, CC: data.CC };
      console.log('Loaded dot data:', this.dotData);
    } catch (error) {
      console.error('Error loading dot data:', error);
    }
  }

  async loadAnalysisOutput() {
    try {
      const data = await invoke<string>('get_analysis_results');
      const parsedData = JSON.parse(data);
      this.tableData = this.parseAnalysisResults(parsedData.results);
      this.mtcMethod = parsedData.mtc_method;
      this.analysisMethod = parsedData.analysis_method;
      this.significantCount = parsedData.significant_count;
      this.resultsLength = parsedData.results_length;
      this.calculateProportions();
    } catch (error) {
      console.error('Error loading analysis output:', error);
      this.tableData = null;
      throw error;
    }
  }

  calculateProportions() {

    this.proportionData = {
      total: { nonSignificant: 0, significant: 0 },
      BP: { nonSignificant: 0, significant: 0 },
      MF: { nonSignificant: 0, significant: 0 },
      CC: { nonSignificant: 0, significant: 0 }
    };
    if (!this.tableData) return;

    this.tableData.forEach(row => {
      const aspect = row.aspect as keyof ProportionData;

      const index = row.adj_pval <= 0.05 ? 'significant' : 'nonSignificant';

      this.proportionData[aspect][index] += 1;
      this.proportionData.total[index] += 1;
    });

    console.log('Proportion Data:', this.proportionData);

  }

  parseAnalysisResults(data: TermRowData[]): TransformedRowData[] {
    return data.map(row => ({
      term_label: row.term_label,
      term_id: row.term_id,
      nt: row.counts[0],
      mt: row.counts[1],
      n: row.counts[2],
      m: row.counts[3],
      p_val: row.p_val,
      adj_pval: row.adj_pval,
      study_annotations: row.study_annotations,
      aspect: row.aspect
    }));
  }
  

  getTableData(): TransformedRowData[] | null {
    return this.tableData;
  }

  getDotData(): DotData | null {
    if (!this.dotData) {
      return null;
    }
    return { ...this.dotData };
  }

  getResultsLength(): number {
    return this.resultsLength;
  }

  getSignificantCount(): number {
    return this.significantCount;
  }

  getMtcMethod(): string {
    return this.mtcMethod;
  }

  getAnalysisMethod(): string {
    return this.analysisMethod;
  }

  getProportionData(): ProportionData {
    return { ...this.proportionData }
  }

}

// stores DOT-graph structure for each GO-Aspect
export interface DotData {
  BP: { nodes: Nodes, edges: Edges };
  MF: { nodes: Nodes, edges: Edges };
  CC: { nodes: Nodes, edges: Edges };
}

export interface Nodes {
  significant: { [termId: string]: NodeData };
  ancestors: { [termId: string]: NodeData };
}

export interface NodeData {
  id: string,    // GO-Term-ID
  label: string, // Term-Label
  adj_pval: number,
  study_count: number,
  population_count: number,
  depth: number,            // depth in the graph
}

export interface Edges {
  compressed: EdgeData[];
  full: EdgeData[];
}

export interface EdgeData {
  source: string, // significant parent node
  target: string, // significant child node
  nodes_skipped: number, // counts how many non-significant nodes were skipped between source and target
  // 0 (solid edge) if direct parent is significant, otherwise >0 (dashed edge)
}

export interface TermRowData {
  term_label: string;
  term_id: string;
  counts: number[];
  p_val: number;
  adj_pval: number;
  study_annotations: string[];
  aspect: string;
}

export interface TransformedRowData {
  term_label: string;
  term_id: string;
  nt: number;
  mt: number;
  n: number;
  m: number;
  p_val: number;
  adj_pval: number;
  study_annotations: string[];
  aspect: string;
}

export interface ProportionEntry {
  nonSignificant: number;
  significant: number;
}

export interface ProportionData {
  total: ProportionEntry;
  BP: ProportionEntry;
  MF: ProportionEntry;
  CC: ProportionEntry;
}

