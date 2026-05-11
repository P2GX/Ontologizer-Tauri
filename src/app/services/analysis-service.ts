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

  readonly selectedMethod = signal<Method | null>(null);
  readonly correction = signal<Correction | null>('None');
  readonly isAnalysing = signal(false);
  readonly analysisStep = signal<AnalysisStep>('idle');
  readonly errorMessage = signal<string | null>(null);

  async saveSettings(method: Method): Promise<void> {
    try {
      await invoke('save_settings', { analysisMethod: method });
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }
}
