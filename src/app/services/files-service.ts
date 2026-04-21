import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  readonly goPath = signal<string | null>(null);
  readonly annotationPath = signal<string | null>(null);
  readonly popPath = signal<string | null>(null);
  readonly studyPath = signal<string | null>(null);

  readonly allPathsSet = computed(() =>
    !!this.goPath() && !!this.annotationPath() && !!this.popPath() && !!this.studyPath()
  );

  /** Set to true after processFiles() completes successfully. */
  readonly filesProcessed = signal(false);

  /** Stats populated after processFiles() runs. */
  readonly goTermCount = signal(0);
  readonly popGeneCount = signal(0);
  readonly studyGeneCount = signal(0);

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
