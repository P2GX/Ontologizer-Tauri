import { computed, Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Method } from './analysis-service';

@Injectable({
  providedIn: 'root'
})
export class ResultsService {
  public currentMethod = signal<Method | null>(null);
  public isBayesian = computed(() => this.currentMethod()?.method === 'Bayesian');
  public isFrequentist = computed(() => this.currentMethod()?.method === 'Frequentist');
  public frequentistTableData = signal<FrequentistRowData[] | null>(null);
  public bayesianTableData = signal<RowData[] | null>(null);
  public barChartData = signal<RowData[] | null>(null);
  public barPlotData = signal<RowData[] | null>(null);
  public frequentistTotalCount = signal<number>(0);
  public bayesianTotalCount = signal<number>(0);

  clearResults() {
    this.frequentistTableData.set(null);
    this.bayesianTableData.set(null);
    this.barChartData.set(null);
    this.barPlotData.set(null);
    this.frequentistTotalCount.set(0);
    this.bayesianTotalCount.set(0);
    this.dotData = null;
    this.significantCount = 0;
    this.resultsLength = 0;
    this.proportionData = {
      total: { nonSignificant: 0, significant: 0 },
      BP: { nonSignificant: 0, significant: 0 },
      MF: { nonSignificant: 0, significant: 0 },
      CC: { nonSignificant: 0, significant: 0 }
    };
  }

  async runAnalysis() {
    try {
      await invoke<void>('run_analysis');
    } catch (error) {
      console.error('Error running analysis:', error);
      this.frequentistTableData.set(null);
      this.dotData = null;
      throw error;
    }
  }

  private dotData: DotData | null = null;
  private mtcMethod: string = '';

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
      if (this.currentMethod()?.method === 'Bayesian') {
        const [firstPage, barPage, barPlotJson] = await Promise.all([
          invoke<{ items: string; total: number }>('get_analysis_results_page', { page: 0, pageSize: 10 }),
          invoke<{ items: string; total: number }>('get_analysis_results_page', { page: 0, pageSize: 100 }),
          invoke<string>('get_bar_chart_data', { n: 50 })
        ]);
        const items = JSON.parse(firstPage.items);
        this.bayesianTableData.set(this.parseBayesianResults(items));
        this.bayesianTotalCount.set(firstPage.total);
        this.resultsLength = firstPage.total;
        this.barChartData.set(this.parseBayesianResults(JSON.parse(barPage.items)));
        this.barPlotData.set(this.parseBayesianResults(JSON.parse(barPlotJson)));
      } else {
        const [summary, firstPage, barPage, barPlotJson] = await Promise.all([
          invoke<AnalysisSummaryResponse>('get_analysis_summary'),
          invoke<{ items: string; total: number }>('get_analysis_results_page', { page: 0, pageSize: 10 }),
          invoke<{ items: string; total: number }>('get_analysis_results_page', { page: 0, pageSize: 100 }),
          invoke<string>('get_bar_chart_data', { n: 50 })
        ]);
        const items = JSON.parse(firstPage.items);
        this.frequentistTableData.set(this.parseAnalysisResults(items));
        this.frequentistTotalCount.set(summary.total);
        this.resultsLength = summary.total;
        this.barChartData.set(this.parseAnalysisResults(JSON.parse(barPage.items)));
        this.barPlotData.set(this.parseAnalysisResults(JSON.parse(barPlotJson)));
        this.proportionData = {
          total: { significant: summary.proportionData.total.significant, nonSignificant: summary.proportionData.total.nonSignificant },
          BP: { significant: summary.proportionData.bp.significant, nonSignificant: summary.proportionData.bp.nonSignificant },
          MF: { significant: summary.proportionData.mf.significant, nonSignificant: summary.proportionData.mf.nonSignificant },
          CC: { significant: summary.proportionData.cc.significant, nonSignificant: summary.proportionData.cc.nonSignificant },
        };
        this.significantCount = summary.proportionData.total.significant;
      }
    } catch (error) {
      console.error('Error loading analysis output:', error);
      this.frequentistTableData.set(null);
      this.bayesianTableData.set(null);
      throw error;
    }
  }

  async loadAnalysisPage(page: number, pageSize: number) {
    try {
      const result = await invoke<{ items: string; total: number }>('get_analysis_results_page', { page, pageSize });
      const items = JSON.parse(result.items);
      if (this.currentMethod()?.method === 'Bayesian') {
        this.bayesianTableData.set(this.parseBayesianResults(items));
      } else {
        this.frequentistTableData.set(this.parseAnalysisResults(items));
      }
    } catch (error) {
      console.error('Error loading analysis page:', error);
    }
  }

  parseAnalysisResults(items: any[]): FrequentistRowData[] {
    const base: RowData[] = items.map(item => ({
      id: item.Id,
      label: item.Label,
      aspect: item.Aspect,
      score: item.Score,
      associatedGenes: item['Associated Genes'] ? item['Associated Genes'].split(', ') : [],
      diagnostics: item.Diagnostics
    }));
    return base.map(row => this.extendFrequentistData(row));
  }

  extendFrequentistData(row: RowData): FrequentistRowData {
    let k = 0, n = 0, K = 0, N = 0;
    if (row.diagnostics) {
      const counts = row.diagnostics.replace(/[()]/g, '').split(',');
      if (counts.length === 4) {
        k = parseInt(counts[0].trim(), 10) || 0;
        n = parseInt(counts[1].trim(), 10) || 0;
        K = parseInt(counts[2].trim(), 10) || 0;
        N = parseInt(counts[3].trim(), 10) || 0;
      }
    }
    return { ...row, k, n, K, N };
  }

  parseBayesianResults(items: any[]): RowData[] {
    return items.map(item => ({
      id: item.Id,
      label: item.Label,
      aspect: item.Aspect,
      score: item.Score,
      associatedGenes: item['Associated Genes'] ? item['Associated Genes'].split(', ') : [],
    }));
  }

  get hasResults(): boolean {
    return this.frequentistTableData() !== null || this.bayesianTableData() !== null;
  }

  getMethod() { return this.currentMethod(); }
  getFrequentistTableData() { return this.frequentistTableData(); }
  getDotData() { return this.dotData; }
  getMtcMethod() { return this.mtcMethod; }
  getSignificantCount() { return this.significantCount; }
  getResultsLength() { return this.resultsLength; }
  getProportionData() { return this.proportionData; }
}

interface AnalysisSummaryResponse {
  total: number;
  proportionData: {
    total: { significant: number; nonSignificant: number };
    bp: { significant: number; nonSignificant: number };
    mf: { significant: number; nonSignificant: number };
    cc: { significant: number; nonSignificant: number };
  };
}

export interface RowData {
  id: string;
  label: string;
  aspect: string;
  score: number;
  associatedGenes: string[];
  diagnostics?: string;
}

export interface FrequentistRowData extends RowData {
  k: number;
  n: number;
  K: number;
  N: number;
}

export interface ProportionData {
  total: { nonSignificant: number, significant: number };
  BP: { nonSignificant: number, significant: number };
  MF: { nonSignificant: number, significant: number };
  CC: { nonSignificant: number, significant: number };
}

// Graph interfaces: 1 graph/tree for each GO-Aspect
export interface DotData {
  BP: { nodes: Nodes, edges: Edges };
  MF: { nodes: Nodes, edges: Edges };
  CC: { nodes: Nodes, edges: Edges };
}

export interface Nodes {
  significant: { [termId: string]: NodeData };
  ancestors: { [termId: string]: NodeData };
  tested: { [termId: string]: NodeData };
}

export interface NodeData {
  id: string,
  label: string,
  p_val: number,
  study_count: number,
  population_count: number,
  depth: number,
}

export interface Edges {
  compressed: EdgeData[];
  full: EdgeData[];
}

export interface EdgeData {
  source: string,
  target: string,
  nodes_skipped: number,
}
