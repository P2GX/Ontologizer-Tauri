import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

// These types mirror the Rust enums in src-tauri/src/commands/config.rs.
// Keep them in sync when the Rust side changes.
export type Topology = 'Standard' | 'ParentUnion' | 'ParentIntersection';
export type Correction = 'Bonferroni' | 'BonferroniHolm' | 'BenjaminHochberg' | 'None';
export type Method =
    | { method: 'bayesian' }
    | { method: 'frequentist'; topology: Topology; correction: Correction };

export const TOPOLOGY_NAMES: Record<Topology, string> = {
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
