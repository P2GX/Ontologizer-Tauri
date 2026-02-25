import { Component, Output, EventEmitter } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { invoke } from '@tauri-apps/api/core'
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
  imports: [MatSelectModule, DropdownMenu, MatDividerModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {

  // Inject the SettingsService
  constructor(private settingsService: SettingsService) { }

  readonly analysisMethods = Object.values(AnalysisMethod);

  readonly mtcMethod = Object.values(MtcMethod);

  // Function that updates user settings when a new option is selected
  async SelectSetting(newSetting: string, type: keyof AppSettings) {
    this.settingsService.updateSettings(newSetting, type);
  }
}
