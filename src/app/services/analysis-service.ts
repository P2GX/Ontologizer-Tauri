import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

// These types mirror the Rust enums in src-tauri/src/commands/config.rs.
// Keep them in sync when the Rust side changes.
export type Background = 'Standard' | 'ParentUnion' | 'ParentIntersection';
export type Correction = 'Bonferroni' | 'BonferroniHolm' | 'BenjaminHochberg' | 'None';
export type Method =
    | { method: 'Bayesian' }
    | { method: 'Frequentist'; background: Background; correction: Correction };

export const BACKGROUND_NAMES: Record<Background, string> = {
  Standard: 'Standard',
  ParentUnion: 'Parent Union',
  ParentIntersection: 'Parent Intersection',
};

export const CORRECTION_NAMES: Record<Correction, string> = {
  Bonferroni: 'Bonferroni',
  BonferroniHolm: 'Bonferroni-Holm',
  BenjaminHochberg: 'Benjamini-Hochberg',
  None: 'None',
};

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  async saveSettings(method: Method): Promise<void> {
    try {
      await invoke('save_settings', { analysisMethod: method });
      console.log('Settings saved:', method);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }
}
