import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { SettingsService, AppSettings } from '../../services/settings-service';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { FilesService } from '../../services/files-service';
import { AnalysisService } from '../../services/analysis-service';
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
    private settingsService: SettingsService,
    private filesService: FilesService,
    private analysisService: AnalysisService,
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
    this.settingsService.updateSettings(newSetting, type);
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
      await this.analysisService.runAnalysis();
      await this.analysisService.loadAnalysisOutput();
      await this.analysisService.loadDotData();
      this.buttonLabel = 'Done!';
      setTimeout(() => this.router.navigate(['/analysis']), 1000);
    } catch (error) {
      console.error('Error running analysis:', error);
      this.snackBar.open('Failed to run analysis.', 'Close', { panelClass: ['custom-snackbar'] });
      this.buttonLabel = 'Start Analysis';
    } finally {
      this.isAnalysing = false;
    }
  }
}
