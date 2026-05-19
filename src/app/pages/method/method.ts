import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { CardHeader } from '../../shared/card-header/card-header';
import { AnalysisService, Correction, CORRECTION_NAMES, STEP_LABELS } from '../../services/analysis-service';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { FilesService } from '../../services/files-service';
import { ResultsService } from '../../services/results-service';
import { openUrl } from '@tauri-apps/plugin-opener';

@Component({
  selector: 'app-method',
  imports: [CommonModule, MatSelectModule, DropdownMenu, CardHeader, MatDividerModule],
  templateUrl: './method.html',
  styleUrl: './method.css',
  standalone: true
})

export class Method {

  private analysisService = inject(AnalysisService);
  readonly filesService = inject(FilesService);
  private resultsService = inject(ResultsService);
  private router = inject(Router);

  get selectedMethod() { return this.analysisService.selectedMethod(); }
  get correction() { return this.analysisService.correction(); }
  isAnalysing = this.analysisService.isAnalysing;
  get analysisStep() { return this.analysisService.analysisStep(); }
  get errorMessage() { return this.analysisService.errorMessage(); }
  get stepHint(): string {
    const step = this.analysisStep;
    return step === 'idle' ? '' : STEP_LABELS[step];
  }

  readonly correctionOptions: Correction[] = ['Bonferroni', 'BonferroniHolm', 'BenjaminiHochberg', 'None'];

  readonly correctionNames = CORRECTION_NAMES;

  get isFrequentist(): boolean {
    return this.selectedMethod?.method === 'Frequentist';
  }

  dismissError() {
    this.analysisService.errorMessage.set(null);
  }

  async openExternalLink(url: string): Promise<void> {
    try {
      await openUrl(url);
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  }

  setCategory(category: 'Frequentist' | 'Bayesian') {
    if (category === 'Bayesian') {
      this.analysisService.selectedMethod.set({ method: 'Bayesian' });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    } else if (this.correction) {
      this.analysisService.selectedMethod.set({ method: 'Frequentist', correction: this.correction });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    } else {
      this.analysisService.selectedMethod.set(null);
    }
  }

  selectCorrection(correction: string) {
    this.analysisService.correction.set(correction as Correction);
    if (this.isFrequentist) {
      this.analysisService.selectedMethod.set({ method: 'Frequentist', correction: this.correction! });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    }
  }

  async startAnalysis() {
    if (!this.selectedMethod) return;

    if (!this.filesService.filesProcessed()) {
      this.analysisService.errorMessage.set(
        'Annotations not loaded. Go to the Files page and click "Process Files" first.'
      );
      return;
    }

    this.analysisService.errorMessage.set(null);
    this.resultsService.clearResults();
    this.resultsService.currentMethod.set(this.selectedMethod);
    this.analysisService.isAnalysing.set(true);
    this.analysisService.analysisStep.set('enrichment');

    try {
      await this.resultsService.runAnalysis();
      this.analysisService.analysisStep.set('output');
      await this.resultsService.loadAnalysisOutput();
      await this.resultsService.loadDotData();
      this.analysisService.analysisStep.set('done');
      void this.router.navigate(['/results']);
    } catch (error) {
      console.error('Error running analysis:', error);
      const detail = typeof error === 'string' ? error : String(error);
      const msg = detail.includes('Annotations not loaded')
        ? 'Annotations not loaded. Go to the Files page and click "Process Files" first.'
        : `Failed to run analysis. ${detail}`;
      this.analysisService.errorMessage.set(msg);
    } finally {
      this.analysisService.isAnalysing.set(false);
      this.analysisService.analysisStep.set('idle');
    }
  }
}
