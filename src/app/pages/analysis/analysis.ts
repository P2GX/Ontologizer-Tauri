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
  topology: Topology | null = null;
  correction: Correction | null = null;
  isAnalysing = false;
  buttonLabel = 'Start Analysis';

  readonly topologyOptions: Topology[] = ['TermForTerm', 'ParentChildUnion', 'ParentChildIntersection'];
  readonly correctionOptions: Correction[] = ['Bonferroni', 'BonferroniHolm', 'BenjaminHochberg', 'None'];

  readonly topologyNames = TOPOLOGY_NAMES;
  readonly correctionNames = CORRECTION_NAMES;

  get isFrequentist(): boolean {
    return typeof this.selectedMethod === 'object' && this.selectedMethod !== null;
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
      this.selectedMethod = 'bayesian';
    } else {
      // Apply defaults on first Frequentist selection; remember previous choices afterwards
      this.topology ??= 'TermForTerm';
      this.correction ??= 'Bonferroni';
      this.selectedMethod = { frequentist: [this.topology, this.correction] };
    }
    void this.analysisService.saveSettings(this.selectedMethod);
  }

  selectTopology(topology: string) {
    this.topology = topology as Topology;
    if (this.isFrequentist) {
      this.selectedMethod = { frequentist: [this.topology, this.correction!] };
      void this.analysisService.saveSettings(this.selectedMethod);
    }
  }

  selectCorrection(correction: string) {
    this.correction = correction as Correction;
    if (this.isFrequentist) {
      this.selectedMethod = { frequentist: [this.topology!, this.correction] };
      void this.analysisService.saveSettings(this.selectedMethod);
    }
  }

  async startAnalysis() {
    if (!this.selectedMethod) return;

    if (!Object.values(this.filesService.getFileStatus()).every(f => f === true)) {
      this.snackBar.open('⚠️ Not all required files are loaded.', 'Close', { panelClass: ['custom-snackbar'] });
      return;
    }

    this.resultsService.currentMethod = this.selectedMethod;
    this.isAnalysing = true;
    this.buttonLabel = 'Analyzing...';

    try {
      await this.resultsService.runAnalysis();
      await this.resultsService.loadAnalysisOutput();
      if (this.selectedMethod !== 'bayesian') {
        await this.resultsService.loadDotData();
      }
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
