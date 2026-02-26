import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';
@Injectable({
  providedIn: 'root'
})

// Service that manages user settings (analysis method, MTC method) and automatically syncs changes with the backend.
export class SettingsService {

  constructor() { }

  // BehaviorSubject to hold user settings. Default values are set here.
  private userSettings = new BehaviorSubject<AppSettings>({
    analysisMethod: 'TermForTerm',
    mtcMethod: 'Bonferroni',
  });

  currentUserSettings = this.userSettings.asObservable();
  subscriptionStarted = false;

  async updateSettings(newSetting: String, type: keyof AppSettings) {
    this.userSettings.next({ ...this.userSettings.getValue(), [type]: newSetting });
  }

  // Call this method to start auto-saving settings whenever they change
  // -> automatically saves settings in the backend
  startAutoSave() {
    if (!this.subscriptionStarted) {
      this.currentUserSettings.subscribe(settings => {
        this.saveSettings(settings);
      });
      this.subscriptionStarted = true;
    }
  }

  getUserSettings(): AppSettings {
    return this.userSettings.getValue();
  }

  private async saveSettings(settings: AppSettings) {
    try {
      await invoke('save_settings', {
        analysisMethod: settings.analysisMethod,
        mtcMethod: settings.mtcMethod
      });
      console.log('Settings saved:', settings);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }

}

export interface AppSettings {
  analysisMethod: string;
  mtcMethod: string;
}