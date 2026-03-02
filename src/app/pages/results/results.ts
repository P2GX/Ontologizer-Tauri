import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrequentistResultTable } from './frequentist-result-table/frequentist-result-table';
import { BayesianResultTable } from './bayesian-result-table/bayesian-result-table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { BarChart } from './bar-chart/bar-chart';
import { Dashboard } from './dashboard/dashboard';
import { GoGraph } from './go-graph/go-graph';
import { FilesService } from '../../services/files-service';
import { ResultsService, DotData, FrequentistRowData, BayesianRowData, ProportionData } from '../../services/results-service';
import { Method } from '../../services/analysis-service';

@Component({
  selector: 'app-results',
  imports: [Dashboard, BarChart, CommonModule, FrequentistResultTable, BayesianResultTable, GoGraph, MatSlideToggleModule, FormsModule, MatInputModule, MatFormFieldModule, MatDividerModule],
  templateUrl: './results.html',
  styleUrl: './results.css',
  standalone: true
})
export class Results implements OnInit {
  constructor(private filesService: FilesService, private resultsService: ResultsService) { }

  selectedChart = 'dashboard';
  tableDataLoaded = false;
  dotData: DotData | null = null;
  frequentistData: FrequentistRowData[] | null = null;
  bayesianData: BayesianRowData[] | null = null;
  success = false;

  get isBayesian(): boolean {
    return this.resultsService.currentMethod === 'bayesian';
  }

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
    if (this.isBayesian) {
      const bayesianData = this.resultsService.getBayesianTableData();
      if (bayesianData === null) return;
      this.bayesianData = bayesianData;
    } else {
      const frequentistData = this.resultsService.getFrequentistTableData();
      if (frequentistData === null) return;
      this.frequentistData = frequentistData;
    }

    this.dashboardInfo = {
      method: this.resultsService.getMethod(),
      studyGenes: this.filesService.getStudyGenesCount(),
      popGenes: this.filesService.getPopGenesCount(),
      goTerms: this.filesService.getGoTermsCount(),
      resultsLength: this.resultsService.getResultsLength(),
      proportionData: this.resultsService.getProportionData()
    };

    this.dotData = this.resultsService.getDotData();
    this.tableDataLoaded = true;
    this.success = true;
  }

  selectTab(tab: string) {
    this.selectedChart = tab;
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
