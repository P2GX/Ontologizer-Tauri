import { AfterViewInit, Component } from '@angular/core';
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
import { AnalysisService, DotData, TransformedRowData, ProportionData } from '../../services/analysis-service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-analysis',
  imports: [Dashboard, AnalysisBarChart, CommonModule, AnalysisResultTable, GoGraph, MatSlideToggleModule, FormsModule, MatInputModule, MatFormFieldModule, MatDividerModule],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  standalone: true
})
export class Analysis {
  constructor(private filesService: FilesService, private analysisService: AnalysisService, private snackBar: MatSnackBar) { }

  buttonLabel = 'Start Analysis';
  selectedChart = 'dashboard';
  isLoading = false;
  graphDataLoaded = false;
  tableDataLoaded = false;
  resultsLength = 0;
  dotData: DotData | null = null;

  tableData: TransformedRowData[] | null = null;
  successful: boolean = false;

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

  selectTab(tab: string) {
    this.selectedChart = tab;
  }

  async startAnalysis() {
    console.log("fileStats", this.filesService.getFileStatus())

    if (!Object.values(this.filesService.getFileStatus())
      .every(fileLoaded => fileLoaded === true)) {
      this.snackBar.open('⚠️ Not all required files are loaded.', 'Close', { panelClass: ['custom-snackbar'] });
      return;
    }
    try {
      this.buttonLabel = 'Analyzing...';
      this.successful = false;
      this.dotData = null;
      this.isLoading = true;
      await this.analysisService.runAnalysis();
      await this.analysisService.loadAnalysisOutput();
      this.tableData = this.analysisService.getTableData();
      this.tableDataLoaded = true;
      this.resultsLength = this.analysisService.getResultsLength();
      await this.analysisService.loadDotData();
      this.dotData = this.analysisService.getDotData();

      const newDashboardInfo: DashboardInfo = {
        studyGenes: this.filesService.getStudyGenesCount(),
        popGenes: this.filesService.getPopGenesCount(),
        goTerms: this.filesService.getGoTermsCount(),
        mtcMethod: this.analysisService.getMtcMethod(),
        analysisMethod: this.analysisService.getAnalysisMethod(),
        resultsLength: this.analysisService.getResultsLength(),
        proportionData: this.analysisService.getProportionData()
      };

      // Neu zuweisen → Childs bekommen neuen Input
      this.dashboardInfo = newDashboardInfo;
      console.log('Methods:', this.dashboardInfo.analysisMethod, this.dashboardInfo.mtcMethod);
      this.successful = true;
    } catch (err) {
      console.error('Error loading analysis:', err);
      alert('Failed to run analysis.');
      this.successful = false;
    } finally {
      this.isLoading = false;
      this.buttonLabel = 'Rerun Analysis';
    }
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



