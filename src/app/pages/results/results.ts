import { Component, computed, inject, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { BarChart } from './bar-chart/bar-chart';
import { Dashboard } from './dashboard/dashboard';
import { GoGraph } from './go-graph/go-graph';
import { ResultTable } from './result-table/result-table';
import { FilesService } from '../../services/files-service';
import { ResultsService, DotData, ProportionData, RowData } from '../../services/results-service';
import { Method } from '../../services/analysis-service';

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

  dashboardInfo: DashboardInfo = {
    method: null,
    resultsLength: 0,
    goTerms: 0,
    studyGenes: 0,
    popGenes: 0,
    proportionData: {
      BP: { significant: 0, nonSignificant: 0 },
      MF: { significant: 0, nonSignificant: 0 },
      CC: { significant: 0, nonSignificant: 0 },
      total: { significant: 0, nonSignificant: 0 }
    }
  };

  ngOnInit() {
    if (this.tableData() === null) return;

    this.dashboardInfo = {
      method: this.resultsService.getMethod(),
      studyGenes: this.filesService.getStudyGenesCount(),
      popGenes: this.filesService.getPopGenesCount(),
      goTerms: this.filesService.getGoTermsCount(),
      resultsLength: this.resultsService.getResultsLength(),
      proportionData: this.resultsService.getProportionData()
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

  private computeLegendMax(data: RowData[]): number {
    if (!data || data.length === 0) return 1;
    const values = this.resultsService.isBayesian()
      ? data.map(d => d.score)
      : data.map(d => -Math.log10(d.score));
    const max = Math.max(...values);
    return isFinite(max) && max > 0 ? max : 1;
  }
}

export interface DashboardInfo {
  method: Method | null;
  resultsLength: number;
  goTerms: number;
  studyGenes: number;
  popGenes: number;
  proportionData: ProportionData;
}
