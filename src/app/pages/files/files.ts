import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { GafCard } from './gaf-card/gaf-card';
import { GoCard } from './go-card/go-card';
import { Router } from '@angular/router';
import { FilesService } from '../../services/files-service';
import { invoke } from "@tauri-apps/api/core";
import { MatDivider } from "@angular/material/list";
import { MatSnackBar } from '@angular/material/snack-bar';
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
  private snackBar = inject(MatSnackBar);
  protected filesService = inject(FilesService);

  isProcessingAll = signal(false);

  allFilesLoaded = computed(() => this.filesService.allPathsSet());

  async processFiles() {
    if (!this.allFilesLoaded()) return;

    this.isProcessingAll.set(true);
    try {
      let goStats: Stat[];
      if (this.filesService.goLoadedForPath() !== this.filesService.goPath()) {
        const json = await invoke<string>('process_go_file', { path: this.filesService.goPath() });
        goStats = JSON.parse(json);
      } else {
        goStats = [];
      }

      await invoke('process_gaf_file', { path: this.filesService.annotationPath() });

      const popJson = await invoke<string>('process_gene_file', { path: this.filesService.popPath(), target: 'population' });
      const popStats: Stat[] = JSON.parse(popJson);

      const studyJson = await invoke<string>('process_gene_file', { path: this.filesService.studyPath(), target: 'study' });
      const studyStats: Stat[] = JSON.parse(studyJson);

      await invoke('build_annotation_index');

      const goTerms = goStats.length > 1 ? Number(goStats[1].value) : this.filesService.goTermCount();
      const popGenes = popStats.length > 0 ? Number(popStats[0].value) : 0;
      const studyGenes = studyStats.length > 0 ? Number(studyStats[0].value) : 0;
      this.filesService.setAnalysisStats(goTerms, popGenes, studyGenes);
      this.filesService.filesProcessed.set(true);

      await this.router.navigate(['/analysis']);
    } catch (error) {
      console.error("Error processing files:", error);
      this.snackBar.open(`Failed to process files: ${error}`, 'Close', { panelClass: ['custom-snackbar'], duration: 8000 });
    } finally {
      this.isProcessingAll.set(false);
    }
  }
}
