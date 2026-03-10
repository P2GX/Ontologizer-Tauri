import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { AnalysisService, Method, Topology, Correction, TOPOLOGY_NAMES, CORRECTION_NAMES } from '../../services/analysis-service';
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

  selectedMethod: Method | null = null;
  topology: Topology = 'Standard';
  correction: Correction = 'None';
  isAnalysing = false;
  private justCompleted = false;

  get buttonLabel(): string {
    if (this.isAnalysing) return 'Analyzing...';
    if (this.justCompleted) return 'Done!';
    if (this.resultsService.hasResults) return 'Rerun Analysis';
    return 'Start Analysis';
  }

  readonly topologyOptions: Topology[] =  ['Standard', 'ParentUnion', 'ParentIntersection'];
  readonly correctionOptions: Correction[] = ['Bonferroni', 'BonferroniHolm', 'BenjaminHochberg', 'None'];

  readonly topologyNames = TOPOLOGY_NAMES;
  readonly correctionNames = CORRECTION_NAMES;

  get isFrequentist(): boolean {
    return this.selectedMethod?.method === 'frequentist';
  }

  constructor(
    private analysisService: AnalysisService,
    private filesService: FilesService,
    private resultsService: ResultsService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  setCategory(category: 'Frequentist' | 'Bayesian') {
    if (category === 'Bayesian') {
      this.selectedMethod = { method: 'bayesian' };
    } else {
      this.selectedMethod = { method: 'frequentist', topology: this.topology, correction: this.correction };
    }
    void this.analysisService.saveSettings(this.selectedMethod);
  }

  selectTopology(topology: string) {
    this.topology = topology as Topology;
    if (this.isFrequentist) {
      this.selectedMethod = { method: 'frequentist', topology: this.topology, correction: this.correction! };
      void this.analysisService.saveSettings(this.selectedMethod);
    }
  }

  selectCorrection(correction: string) {
    this.correction = correction as Correction;
    if (this.isFrequentist) {
      this.selectedMethod = { method: 'frequentist', topology: this.topology!, correction: this.correction };
      void this.analysisService.saveSettings(this.selectedMethod);
    }
  }

  async startAnalysis() {
    if (!this.selectedMethod) return;

    if (!Object.values(this.filesService.getFileStatus()).every(f => f === true)) {
      this.snackBar.open('⚠️ Not all required files are loaded.', 'Close', { panelClass: ['custom-snackbar'] });
      return;
    }

    this.resultsService.clearResults();
    this.resultsService.currentMethod.set(this.selectedMethod);
    this.isAnalysing = true;

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
      this.isAnalysing = false;
    }
  }
}
