import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { GafCard } from './gaf-card/gaf-card';
import { GoCard } from './go-card/go-card';
import { Router } from '@angular/router';
import { FilesService } from '../../services/files-service';
import { invoke } from "@tauri-apps/api/core";
import { MatDivider } from "@angular/material/list";
import { GeneCard } from "./gene-card/gene-card";

type Stat = { key: string; value: string };

@Component({
  selector: 'app-files',
  imports: [GoCard, GafCard, MatDivider, GeneCard],
  templateUrl: './files.html',
  styleUrl: './files.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Files {
  private router = inject(Router);
  protected filesService = inject(FilesService);

  isProcessingAll = signal(false);

  allFilesLoaded = computed(() => this.filesService.allPathsSet());

  dismissError() {
    this.filesService.errorMessage.set(null);
  }

  async processFiles() {
    if (!this.allFilesLoaded()) return;

    this.filesService.errorMessage.set(null);
    this.isProcessingAll.set(true);
    try {
      let goStats: Stat[];
      if (this.filesService.goLoadedForPath() !== this.filesService.goPath()) {
        const json = await invoke<string>('process_go_file', { path: this.filesService.goPath() });
        goStats = JSON.parse(json);
      } else {
        goStats = [];
      }

      const gafJson = await invoke<string>('process_gaf_file', { path: this.filesService.annotationPath() });
      const gafStats: Stat[] = JSON.parse(gafJson);

      const popJson = await invoke<string>('process_gene_file', { path: this.filesService.popPath(), target: 'population' });
      const popStats: Stat[] = JSON.parse(popJson);

      const studyJson = await invoke<string>('process_gene_file', { path: this.filesService.studyPath(), target: 'study' });
      const studyStats: Stat[] = JSON.parse(studyJson);

      await invoke('build_annotation_index');

      const goTerms = goStats.length > 1 ? Number(goStats[1].value) : this.filesService.goTermCount();
      const popGenes = popStats.length > 0 ? Number(popStats[0].value) : 0;
      const studyGenes = studyStats.length > 0 ? Number(studyStats[0].value) : 0;
      this.filesService.setAnalysisStats(goTerms, popGenes, studyGenes);
      this.filesService.gafAnnotationCount.set(gafStats.length > 1 ? Number(gafStats[1].value) : 0);
      this.filesService.gafUniqueGenes.set(gafStats.length > 2 ? Number(gafStats[2].value) : 0);
      this.filesService.studyUnrecognizedCount.set(studyStats.length > 1 ? Number(studyStats[1].value) : 0);
      this.filesService.filesProcessed.set(true);

      await this.router.navigate(['/method']);
    } catch (error) {
      console.error("Error processing files:", error);
      const detail = typeof error === 'string' ? error : String(error);
      this.filesService.errorMessage.set(`Failed to process files. ${detail}`);
    } finally {
      this.isProcessingAll.set(false);
    }
  }
}
