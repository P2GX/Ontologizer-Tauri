import { Component, computed, inject, OnInit, ViewChild } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { BarChart } from './bar-chart/bar-chart';
import { Dashboard } from './dashboard/dashboard';
import { GoGraph } from './go-graph/go-graph';
import { ResultTable } from './result-table/result-table';
import { FilesService } from '../../services/files-service';
import { ResultsService, DotData, ProportionData, RowData, BayesianPriors, BayesianPosteriors } from '../../services/results-service';
import { Method } from '../../services/analysis-service';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { shortenPath } from '../../shared/utils/path';

@Component({
  selector: 'app-results',
  imports: [Dashboard, BarChart, ResultTable, GoGraph, MatDividerModule],
  templateUrl: './results.html',
  styleUrl: './results.css',
  standalone: true
})
export class Results implements OnInit {
  private filesService = inject(FilesService);
  public resultsService = inject(ResultsService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(BarChart) private barChartRef?: BarChart;
  @ViewChild(GoGraph) private goGraphRef?: GoGraph;

  frequentistData = computed(() => this.resultsService.frequentistTableData());
  bayesianData = computed(() => this.resultsService.bayesianTableData());
  tableData = computed(() =>
    this.resultsService.isBayesian() ? this.bayesianData() : this.frequentistData()
  );
  totalCount = computed(() =>
    this.resultsService.isBayesian()
      ? this.resultsService.bayesianTotalCount()
      : this.resultsService.frequentistTotalCount()
  );

  selectedChart = 'dashboard';
  dotData: DotData | null = null;
  success = false;
  globalLegendMax = 1;

  dashboardInfo: DashboardInfo = emptyDashboardInfo();

  async ngOnInit() {
    if (this.tableData() === null) return;

    const home = await homeDir();
    const display = (p: string | null) => p ? shortenPath(p, home) : null;
    const proportion = this.resultsService.getProportionData();

    this.dashboardInfo = {
      method: this.resultsService.getMethod(),
      go: {
        path: display(this.filesService.goPath()),
        version: this.filesService.goVersion(),
        terms: this.filesService.goTermCount(),
      },
      gaf: {
        path: display(this.filesService.annotationPath()),
        version: this.filesService.gafVersion(),
        organism: this.filesService.gafOrganism(),
        annotations: this.filesService.gafAnnotationCount(),
        uniqueGenes: this.filesService.gafUniqueGenes(),
      },
      pop: {
        path: display(this.filesService.popPath()),
        count: this.filesService.popGeneCount(),
      },
      study: {
        path: display(this.filesService.studyPath()),
        recognized: this.filesService.studyGeneCount(),
        unrecognized: this.filesService.studyUnrecognizedCount(),
      },
      results: {
        total: this.resultsService.getResultsLength(),
        significant: proportion.total.significant,
        proportionData: proportion,
      },
      bayesianPriors: this.resultsService.bayesianPriors(),
      bayesianPosteriors: this.resultsService.bayesianPosteriors(),
    };

    this.dotData = this.resultsService.getDotData();
    this.globalLegendMax = this.computeLegendMax(this.tableData()!);
    this.success = true;
  }

  onPageChange(event: { pageIndex: number; pageSize: number }) {
    void this.resultsService.loadAnalysisPage(event.pageIndex, event.pageSize);
  }

  selectTab(tab: string) {
    this.selectedChart = tab;
  }

  /** True when the current tab shows a figure that "Save Figure" can export. */
  get isFigureTab(): boolean {
    return this.selectedChart === 'bar-plot' || this.selectedChart === 'go-graph';
  }

  async saveResults() {
    const path = await save({
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      defaultPath: 'enrichment_result.csv',
    });
    if (!path) return;

    try {
      await invoke('save_results', { path });
      this.snackBar.open('Results saved.', 'Close', { panelClass: ['custom-snackbar'], duration: 4000 });
    } catch (error) {
      console.error('Error saving results:', error);
      this.snackBar.open('Failed to save results.', 'Close', { panelClass: ['custom-snackbar'], duration: 8000 });
    }
  }

  /** Saves the figure on the currently active chart tab as a PNG. The bar
   *  plot exports its Chart.js canvas; the GO graph rasterizes the currently
   *  selected aspect (MF/BP/CC) from its Graphviz SVG. */
  async saveFigure() {
    let pngBase64: string | null = null;
    let defaultName = 'figure.png';

    if (this.selectedChart === 'bar-plot') {
      pngBase64 = this.barChartRef?.exportPng() ?? null;
      defaultName = 'bar_plot.png';
    } else if (this.selectedChart === 'go-graph') {
      try {
        pngBase64 = (await this.goGraphRef?.exportPng()) ?? null;
      } catch (error) {
        console.error('Error rasterizing GO graph:', error);
        pngBase64 = null;
      }
      const aspect = this.goGraphRef?.selectedAspectCode ?? 'graph';
      defaultName = `go_graph_${aspect}.png`;
    }

    if (!pngBase64) {
      this.snackBar.open('Nothing to save — figure is empty.', 'Close', { panelClass: ['custom-snackbar'], duration: 4000 });
      return;
    }

    const path = await save({
      filters: [{ name: 'PNG image', extensions: ['png'] }],
      defaultPath: defaultName,
    });
    if (!path) return;

    try {
      await invoke('save_binary_file', { path, dataB64: pngBase64 });
      this.snackBar.open('Figure saved.', 'Close', { panelClass: ['custom-snackbar'], duration: 4000 });
    } catch (error) {
      console.error('Error saving figure:', error);
      this.snackBar.open('Failed to save figure.', 'Close', { panelClass: ['custom-snackbar'], duration: 8000 });
    }
  }

  /** Frequentist colorbar caps at 10 ( -log10(p) = 10  ⇔  p = 1e-10 ).
   *  Anything more significant maps to the high end of the scale; anything less
   *  spreads across the visible range. Bayesian uses the data's actual max. */
  private static readonly FREQUENTIST_LEGEND_CAP = 10;

  private computeLegendMax(data: RowData[]): number {
    if (!data || data.length === 0) return 1;
    if (!this.resultsService.isBayesian()) {
      return Results.FREQUENTIST_LEGEND_CAP;
    }
    const max = data.reduce((acc, d) => (d.score > acc ? d.score : acc), 0);
    return isFinite(max) && max > 0 ? max : 1;
  }
}

export interface DashboardInfo {
  method: Method | null;
  go: {
    path: string | null;
    version: string | null;
    terms: number;
  };
  gaf: {
    path: string | null;
    version: string | null;
    organism: string | null;
    annotations: number;
    uniqueGenes: number;
  };
  pop: {
    path: string | null;
    count: number;
  };
  study: {
    path: string | null;
    recognized: number;
    unrecognized: number;
  };
  results: {
    total: number;
    significant: number;
    proportionData: ProportionData;
  };
  bayesianPriors: BayesianPriors | null;
  bayesianPosteriors: BayesianPosteriors | null;
}

function emptyDashboardInfo(): DashboardInfo {
  return {
    method: null,
    go: { path: null, version: null, terms: 0 },
    gaf: { path: null, version: null, organism: null, annotations: 0, uniqueGenes: 0 },
    pop: { path: null, count: 0 },
    study: { path: null, recognized: 0, unrecognized: 0 },
    results: {
      total: 0,
      significant: 0,
      proportionData: {
        BP: { significant: 0, nonSignificant: 0 },
        MF: { significant: 0, nonSignificant: 0 },
        CC: { significant: 0, nonSignificant: 0 },
        total: { significant: 0, nonSignificant: 0 }
      }
    },
    bayesianPriors: null,
    bayesianPosteriors: null,
  };
}
