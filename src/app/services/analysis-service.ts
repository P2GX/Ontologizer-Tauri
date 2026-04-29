import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

// These types mirror the Rust enums in src-tauri/src/commands/settings.
// Keep them in sync when the Rust side changes.
export type Background = 'Standard' | 'ParentUnion' | 'ParentIntersection';
export type Correction = 'Bonferroni' | 'BonferroniHolm' | 'BenjaminHochberg' | 'None';
export type Method =
    | { method: 'Bayesian' }
    | { method: 'Frequentist'; background: Background; correction: Correction };

export const CORRECTION_NAMES: Record<Correction, string> = {
  Bonferroni: 'Bonferroni',
  BonferroniHolm: 'Bonferroni-Holm',
  BenjaminHochberg: 'Benjamini-Hochberg',
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

  readonly selectedMethod = signal<Method | null>(null);
  readonly correction = signal<Correction | null>('None');
  readonly isAnalysing = signal(false);
  readonly analysisStep = signal<AnalysisStep>('idle');
  readonly errorMessage = signal<string | null>(null);

  async saveSettings(method: Method): Promise<void> {
    try {
      await invoke('save_settings', { analysisMethod: method });
      console.log('Settings saved:', method);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }
}
