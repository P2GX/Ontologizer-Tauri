import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { SettingsService, AppSettings } from '../../services/settings-service';
import { MatDividerModule } from '@angular/material/divider';

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

  // Top-level UI state: Initialized to null so no card is selected by default
  selectedCategory: 'Frequentist' | 'Bayesian' | null = null;

  // Sub-method states
  currentFrequentistMethod: string = AnalysisMethod.TermForTerm;
  currentMtcMethod: string = MtcMethod.Bonferroni;

  readonly frequentistMethods = [
    AnalysisMethod.TermForTerm,
    AnalysisMethod.ParentChildUnion,
    AnalysisMethod.ParentChildIntersection
  ];

  readonly mtcMethod = Object.values(MtcMethod);

  constructor(private settingsService: SettingsService) { }

  // Switches between the two main cards
  setCategory(category: 'Frequentist' | 'Bayesian') {
    this.selectedCategory = category;

    if (category === 'Bayesian') {
      // Automatically select MGSA and send to backend
      this.SelectSetting(AnalysisMethod.MGSA, 'analysisMethod');
    } else {
      // Restore the previously selected Frequentist method
      this.SelectSetting(this.currentFrequentistMethod, 'analysisMethod');
    }
  }

  // Updates specific dropdown selections
  SelectSetting(newSetting: string, type: keyof AppSettings) {
    if (type === 'analysisMethod' && newSetting !== AnalysisMethod.MGSA) {
      this.currentFrequentistMethod = newSetting;
    }
    if (type === 'mtcMethod') {
      this.currentMtcMethod = newSetting;
    }
    this.settingsService.updateSettings(newSetting, type);
  }

  // Triggered by the "Start Analysis" button
  startAnalysis() {
    if (!this.selectedCategory) return;

    console.log(`Starting ${this.selectedCategory} analysis...`);
  }
}