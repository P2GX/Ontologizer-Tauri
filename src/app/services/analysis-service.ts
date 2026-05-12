import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

// These types mirror the Rust enums in the upstream `ontologizer` crate.
// Keep them in sync when the Rust side changes.
export type Correction = 'Bonferroni' | 'BonferroniHolm' | 'BenjaminiHochberg' | 'None';
export type Method =
    | { method: 'Bayesian' }
    | { method: 'Frequentist'; correction: Correction };

export const CORRECTION_NAMES: Record<Correction, string> = {
  Bonferroni: 'Bonferroni',
  BonferroniHolm: 'Bonferroni-Holm',
  BenjaminiHochberg: 'Benjamini-Hochberg',
  None: 'None',
};

export type AnalysisStep = 'idle' | 'enrichment' | 'output' | 'graph' | 'done';

export const STEP_LABELS: Record<AnalysisStep, string> = {
  idle: '',
  enrichment: 'Computing enrichment',
  output: 'Loading results',
  graph: 'Building GO graph',
  done: 'Done',
};

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  // Default selection: Frequentist with no multiple-testing correction.
  // Mirrors the dropdown's default below so the method page is ready to run
  // on first visit — no need to open the correction menu to "wake up" the
  // Start Analysis button.
  readonly selectedMethod = signal<Method | null>({ method: 'Frequentist', correction: 'Bonferroni' });
  readonly correction = signal<Correction | null>('Bonferroni');
  readonly isAnalysing = signal(false);
  readonly analysisStep = signal<AnalysisStep>('idle');
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    // Seed the Rust side with the default method so run_analysis works on
    // first click — without this, the backend errors out with "Settings not
    // loaded" until the user touches a dropdown.
    const method = this.selectedMethod();
    if (method) void this.saveSettings(method);
  }

  async saveSettings(method: Method): Promise<void> {
    try {
      await invoke('save_settings', { analysisMethod: method });
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }
}
