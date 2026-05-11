import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  readonly goPath = signal<string | null>(null);
  readonly annotationPath = signal<string | null>(null);
  readonly popPath = signal<string | null>(null);
  readonly studyPath = signal<string | null>(null);

  // Cached once at app startup so any consumer that needs to shorten a path
  // for display can do so synchronously. Null only during the brief Tauri
  // IPC window at boot — well before the user finishes file upload + analysis.
  readonly homeDir = signal<string | null>(null);

  constructor() {
    void homeDir().then(h => this.homeDir.set(h)).catch(() => {});
  }

  readonly geneResetToken = signal(0);

  /** Inline error surfaced on /files when processFiles or background load fails. */
  readonly errorMessage = signal<string | null>(null);

  /** Lists the file roles that have not been selected yet, for inline validation copy. */
  readonly missingFiles = computed<string[]>(() => {
    const missing: string[] = [];
    if (!this.goPath()) missing.push('Gene Ontology');
    if (!this.annotationPath()) missing.push('GO Association File');
    if (!this.popPath()) missing.push('Population gene list');
    if (!this.studyPath()) missing.push('Study gene list');
    return missing;
  });

  clearGeneFiles(): void {
    this.popPath.set(null);
    this.studyPath.set(null);
    this.studyUnrecognizedCount.set(0);
    this.geneResetToken.update(n => n + 1);
  }

  readonly allPathsSet = computed(() =>
    !!this.goPath() && !!this.annotationPath() && !!this.popPath() && !!this.studyPath()
  );

  /** Set to true after processFiles() completes successfully. */
  readonly filesProcessed = signal(false);

  /** Stats populated after processFiles() runs. */
  readonly goTermCount = signal(0);
  readonly popGeneCount = signal(0);
  readonly studyGeneCount = signal(0);
  readonly studyUnrecognizedCount = signal(0);
  readonly gafAnnotationCount = signal(0);
  readonly gafUniqueGenes = signal(0);

  /** Metadata mirrored from the file cards so the dashboard can read it in one place. */
  readonly goVersion = signal<string | null>(null);
  readonly gafVersion = signal<string | null>(null);
  readonly gafOrganism = signal<string | null>(null);

  /** Tracks which GO path is already loaded in backend state (used to skip re-processing). */
  readonly goLoadedForPath = signal<string | null>(null);

  private goGeneration = 0;

  setPath(type: 'go' | 'annotation' | 'pop' | 'study', path: string): void {
    switch (type) {
      case 'go': this.goPath.set(path); break;
      case 'annotation': this.annotationPath.set(path); break;
      case 'pop': this.popPath.set(path); break;
      case 'study': this.studyPath.set(path); break;
    }
  }

  startGoBackgroundLoad(path: string): void {
    const generation = ++this.goGeneration;
    invoke<string>('process_go_file', { path }).then(json => {
      if (this.goGeneration === generation) {
        this.goLoadedForPath.set(path);
        const stats: { key: string; value: string }[] = JSON.parse(json);
        if (stats.length > 1) this.goTermCount.set(Number(stats[1].value));
      }
    }).catch(err => {
      console.error('Background GO load failed:', err);
    });
  }

  setAnalysisStats(goTerms: number, popGenes: number, studyGenes: number): void {
    this.goTermCount.set(goTerms);
    this.popGeneCount.set(popGenes);
    this.studyGeneCount.set(studyGenes);
  }
}
