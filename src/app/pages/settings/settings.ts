import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { SettingsService, AppSettings } from '../../services/settingsService';
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
  selector: 'app-settings',
  imports: [CommonModule, MatSelectModule, DropdownMenu, MatDividerModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  standalone: true
})
export class Settings {

  // Top-level UI state
  selectedCategory: 'Frequentist' | 'Bayesian' = 'Frequentist';

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
}