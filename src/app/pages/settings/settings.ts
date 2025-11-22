import { Component, Output, EventEmitter } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { invoke } from '@tauri-apps/api/core'
import { DropdownMenu } from '../../shared/dropdown-menu/dropdown-menu';
import { SettingsService, AppSettings } from '../../services/settingsService';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-settings',
  imports: [MatSelectModule, DropdownMenu, MatDividerModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {

  // Inject the SettingsService
  constructor(private settingsService: SettingsService) { }

  AnalysisMethods: string[] = [
    'TermForTerm',
    'ParentChildUnion',
    'ParentChildIntersection',
    'MGSA'
  ];
  MtcMethods: string[] = [
    'Bonferroni',
    'BonferroniHolm',
    'BenjaminiHochberg',
    'None'
  ];

  // Function that updates user settings when a new option is selected
  async SelectSetting(newSetting: string, type: keyof AppSettings) {
    this.settingsService.updateSettings(newSetting, type);
  }
}
