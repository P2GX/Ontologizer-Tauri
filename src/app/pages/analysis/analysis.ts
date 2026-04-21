import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { AnalysisService, Method, Background, Correction, BACKGROUND_NAMES, CORRECTION_NAMES } from '../../services/analysis-service';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { FilesService } from '../../services/files-service';
import { ResultsService } from '../../services/results-service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-analysis',
  imports: [CommonModule, MatSelectModule, DropdownMenu, MatDividerModule],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  standalone: true
})

export class Analysis {

  private justCompleted = false;

  get selectedMethod() { return this.analysisService.selectedMethod(); }
  get topology() { return this.analysisService.topology(); }
  get correction() { return this.analysisService.correction(); }
  get isAnalysing() { return this.analysisService.isAnalysing(); }

  get buttonLabel(): string {
    if (this.isAnalysing) return 'Analyzing...';
    if (this.justCompleted) return 'Done!';
    if (this.resultsService.hasResults) return 'Rerun Analysis';
    return 'Start Analysis';
  }

  readonly topologyOptions: Background[] =  ['Standard', 'ParentUnion', 'ParentIntersection'];
  readonly correctionOptions: Correction[] = ['Bonferroni', 'BonferroniHolm', 'BenjaminHochberg', 'None'];

  readonly topologyNames = BACKGROUND_NAMES;
  readonly correctionNames = CORRECTION_NAMES;

  get isFrequentist(): boolean {
    return this.selectedMethod?.method === 'Frequentist';
  }

  constructor(
    private analysisService: AnalysisService,
    readonly filesService: FilesService,
    private resultsService: ResultsService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  setCategory(category: 'Frequentist' | 'Bayesian') {
    if (category === 'Bayesian') {
      this.analysisService.selectedMethod.set({ method: 'Bayesian' });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    } else if (this.topology && this.correction) {
      this.analysisService.selectedMethod.set({ method: 'Frequentist', background: this.topology, correction: this.correction });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    } else {
      this.analysisService.selectedMethod.set(null);
    }
  }

  selectTopology(topology: string) {
    this.analysisService.topology.set(topology as Background);
    if (this.isFrequentist && this.correction) {
      this.analysisService.selectedMethod.set({ method: 'Frequentist', background: this.topology!, correction: this.correction });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    }
  }

  selectCorrection(correction: string) {
    this.analysisService.correction.set(correction as Correction);
    if (this.isFrequentist && this.topology) {
      this.analysisService.selectedMethod.set({ method: 'Frequentist', background: this.topology, correction: this.correction! });
      void this.analysisService.saveSettings(this.analysisService.selectedMethod()!);
    }
  }

  async startAnalysis() {
    if (!this.selectedMethod) return;

    if (!this.filesService.filesProcessed()) {
      this.snackBar.open('⚠️ Not all required files are loaded.', 'Close', { panelClass: ['custom-snackbar'] });
      return;
    }

    this.resultsService.clearResults();
    this.resultsService.currentMethod.set(this.selectedMethod);
    this.analysisService.isAnalysing.set(true);

    try {
      await this.resultsService.runAnalysis();
      await this.resultsService.loadAnalysisOutput();
      await this.resultsService.loadDotData();
      this.justCompleted = true;
      setTimeout(() => this.router.navigate(['/results']), 1000);
    } catch (error) {
      console.error('Error running analysis:', error);
      const msg = typeof error === 'string' && error.includes('Annotations not loaded')
        ? 'Annotations not loaded — please go to the Files page and click "Process Files" first.'
        : 'Failed to run analysis.';
      this.snackBar.open(msg, 'Close', { panelClass: ['custom-snackbar'], duration: 8000 });
    } finally {
      this.analysisService.isAnalysing.set(false);
    }
  }
}