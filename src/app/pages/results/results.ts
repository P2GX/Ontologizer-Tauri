import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResultTable } from './analysis-result-table/analysis-result-table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { AnalysisBarChart } from './analysis-bar-chart/analysis-bar-chart';
import { Dashboard } from './dashboard/dashboard';
import { GoGraph } from './go-graph/go-graph';
import { FilesService } from '../../services/files-service';
import { AnalysisService, DotData, FrequentistRowData, ProportionData } from '../../services/analysis-service';

@Component({
  selector: 'app-results',
  imports: [Dashboard, AnalysisBarChart, CommonModule, AnalysisResultTable, GoGraph, MatSlideToggleModule, FormsModule, MatInputModule, MatFormFieldModule, MatDividerModule],
  templateUrl: './results.html',
  styleUrl: './results.css',
  standalone: true
})
export class Results implements OnInit {
  constructor(private filesService: FilesService, private analysisService: AnalysisService) { }

  selectedChart = 'dashboard';
  tableDataLoaded = false;
  dotData: DotData | null = null;
  tableData: FrequentistRowData[] | null = null;
  successful = false;

  dashboardInfo: DashboardInfo = {
    mtcMethod: '',
    analysisMethod: '',
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
    const tableData = this.analysisService.getTableData();
    if (tableData === null) return;

    this.tableData = tableData;
    this.tableDataLoaded = true;
    this.dotData = this.analysisService.getDotData();
    this.dashboardInfo = {
      studyGenes: this.filesService.getStudyGenesCount(),
      popGenes: this.filesService.getPopGenesCount(),
      goTerms: this.filesService.getGoTermsCount(),
      mtcMethod: this.analysisService.getMtcMethod(),
      analysisMethod: this.analysisService.getAnalysisMethod(),
      resultsLength: this.analysisService.getResultsLength(),
      proportionData: this.analysisService.getProportionData()
    };
    this.successful = true;
  }

  selectTab(tab: string) {
    this.selectedChart = tab;
  }
}

export interface DashboardInfo {
  mtcMethod: string;
  analysisMethod: string;
  resultsLength: number;
  goTerms: number;
  studyGenes: number;
  popGenes: number;
  proportionData: ProportionData;
}
