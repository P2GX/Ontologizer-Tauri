import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { AnalysisService, AppSettings } from '../../services/analysis-service';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { FilesService } from '../../services/files-service';
import { ResultsService } from '../../services/results-service';
import { MatSnackBar } from '@angular/material/snack-bar';

export enum AnalysisMethod {
  TermForTerm = 'TermForTerm',
  ParentChildUnion = 'ParentChildUnion',
  ParentChildIntersection = 'ParentChildIntersection',
  MGSA = 'MGSA'
}

export enum MtcMethod {
  Bonferroni ='Bonferroni',
  BonferroniHolm = 'BonferroniHolm',
  BenjaminiHochberg = 'BenjaminiHochberg',
  None = 'None'
}

@Component({
  selector: 'app-analysis',
  imports: [CommonModule, MatSelectModule, DropdownMenu, MatDividerModule],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  standalone: true
})
export class Analysis {

  selectedCategory: 'Frequentist' | 'Bayesian' | null = null;
  isAnalysing = false;
  buttonLabel = 'Start Analysis';

  currentFrequentistMethod: string = AnalysisMethod.TermForTerm;
  currentMtcMethod: string = MtcMethod.Bonferroni;

  readonly frequentistMethods = [
    AnalysisMethod.TermForTerm,
    AnalysisMethod.ParentChildUnion,
    AnalysisMethod.ParentChildIntersection
  ];

  readonly mtcMethod = Object.values(MtcMethod);

  constructor(
    private analysisService: AnalysisService,
    private filesService: FilesService,
    private resultsService: ResultsService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  setCategory(category: 'Frequentist' | 'Bayesian') {
    this.selectedCategory = category;

    if (category === 'Bayesian') {
      this.SelectSetting(AnalysisMethod.MGSA, 'analysisMethod');
    } else {
      this.SelectSetting(this.currentFrequentistMethod, 'analysisMethod');
    }
  }

  SelectSetting(newSetting: string, type: keyof AppSettings) {
    if (type === 'analysisMethod' && newSetting !== AnalysisMethod.MGSA) {
      this.currentFrequentistMethod = newSetting;
    }
    if (type === 'mtcMethod') {
      this.currentMtcMethod = newSetting;
    }
    this.analysisService.updateSettings(newSetting, type);
  }

  async startAnalysis() {
    if (!this.selectedCategory) return;

    if (!Object.values(this.filesService.getFileStatus()).every(f => f === true)) {
      this.snackBar.open('⚠️ Not all required files are loaded.', 'Close', { panelClass: ['custom-snackbar'] });
      return;
    }

    this.isAnalysing = true;
    this.buttonLabel = 'Analyzing...';

    try {
      await this.resultsService.runAnalysis();
      await this.resultsService.loadAnalysisOutput();
      await this.resultsService.loadDotData();
      this.buttonLabel = 'Done!';
      setTimeout(() => this.router.navigate(['/results']), 1000);
    } catch (error) {
      console.error('Error running analysis:', error);
      this.snackBar.open('Failed to run analysis.', 'Close', { panelClass: ['custom-snackbar'] });
      this.buttonLabel = 'Start Analysis';
    } finally {
      this.isAnalysing = false;
    }
  }
}
