import { Component, signal, computed } from '@angular/core';
import { FileUpload } from './file-upload/file-upload';
import { Router } from '@angular/router';
import { FileStatus, FilesService } from '../../services/files-service';
import { invoke } from "@tauri-apps/api/core";
import { MatDivider } from "@angular/material/list";
import { MatSnackBar } from '@angular/material/snack-bar';
import {GeneCard} from "./gene-card/gene-card";

@Component({
  selector: 'app-files',
  imports: [FileUpload, MatDivider, GeneCard],
  templateUrl: './files.html',
  styleUrl: './files.css',
})
export class Files{

  constructor(readonly filesService: FilesService, private router: Router, private snackBar: MatSnackBar) {}

  filesStatus = signal<FileStatus>({ study: false, pop: false, go: false, annotation: false });
  isProcessingAll = signal(false);
  isFinished = signal(false);
  triggerReload = signal(0); // incremented when population is reloaded, triggers study to reprocess

  allFilesLoaded = computed(() => {
    const s = this.filesStatus();
    return s.go && s.annotation && s.pop && s.study;
  });

  uploadSteps = [
    { type: 'go' as keyof FileStatus, title: "Upload Gene Ontology", subtitle: 'Accepted File Types: .json', dependsOn: null, fileLoaded: () => this.filesStatus().go },
    { type: 'annotation' as keyof FileStatus, title: 'Upload Annotations', subtitle: 'Accepted File Types: .gaf', dependsOn: null, fileLoaded: () => this.filesStatus().annotation },
    { type: 'pop' as keyof FileStatus, title: 'Upload Population Genes', subtitle: 'Accepted File Types: .txt', dependsOn: null, fileLoaded: () => this.filesStatus().pop },
    { type: 'study' as keyof FileStatus, title: 'Upload Study Genes', subtitle: 'Accepted File Types: .txt', dependsOn: 'pop' as keyof FileStatus, fileLoaded: () => this.filesStatus().study }
  ];

  onFileLoadedSuccess(fileType: keyof FileStatus) {
    this.filesStatus.update(status => ({ ...status, [fileType]: true }));
    this.filesService.updateFileStatus({ [fileType]: true });

    if (fileType === 'pop') {
      this.triggerReload.update(v => v + 1);
    }
  }

  async processFiles() {
    if (!this.allFilesLoaded()) return;

    this.isProcessingAll.set(true);
    try {
      const result = await invoke('build_annotation_index');
      console.log("Success:", result);
      this.isFinished.set(true);
    } catch (error) {
      console.error("Error building annotation index:", error);
      this.snackBar.open(`Failed to process files: ${error}`, 'Close', { panelClass: ['custom-snackbar'], duration: 8000 });
    } finally {
      this.isProcessingAll.set(false);
      this.router.navigate(['/analysis']);
    }
  }
}