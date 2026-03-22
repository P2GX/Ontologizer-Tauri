import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, signal, computed } from '@angular/core';
import { FileUpload } from './file-upload/file-upload';
import { Router } from '@angular/router';
import { FileStatus, FilesService } from '../../services/files-service';
import { invoke } from "@tauri-apps/api/core";
import { MatDivider } from "@angular/material/list";
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-files',
  imports: [FileUpload, MatDivider],
  templateUrl: './files.html',
  styleUrl: './files.css',
})
export class Files implements AfterViewInit {

  constructor(private filesService: FilesService, private router: Router, private snackBar: MatSnackBar) {}

  filesStatus = signal<FileStatus>({ study: false, pop: false, go: false, annotation: false });
  isProcessingAll = signal(false);
  isFinished = signal(false);
  activeStep = signal(0);
  triggerReload = signal(0); // incremented when annotation is reloaded, triggers study/pop to reprocess

  allFilesLoaded = computed(() => Object.values(this.filesStatus()).every(v => v));

  uploadSteps = [
    { type: 'go' as keyof FileStatus, title: 'Upload Gene Ontology', subtitle: 'Accepted File Types: .json', dependsOn: null, fileLoaded: () => this.filesStatus().go },
    { type: 'annotation' as keyof FileStatus, title: 'Upload Annotations', subtitle: 'Accepted File Types: .gaf', dependsOn: null, fileLoaded: () => this.filesStatus().annotation },
    { type: 'pop' as keyof FileStatus, title: 'Upload Population Genes', subtitle: 'Accepted File Types: .txt', dependsOn: 'annotation' as keyof FileStatus, fileLoaded: () => this.filesStatus().pop },
    { type: 'study' as keyof FileStatus, title: 'Upload Study Genes', subtitle: 'Accepted File Types: .txt', dependsOn: 'annotation' as keyof FileStatus, fileLoaded: () => this.filesStatus().study }
  ];

  onFileLoadedSuccess(fileType: keyof FileStatus) {
    this.filesStatus.update(status => ({ ...status, [fileType]: true }));
    this.filesService.updateFileStatus({ [fileType]: true });

    if (fileType === 'annotation') {
      this.triggerReload.update(v => v + 1);
    }
  }

  @ViewChildren('sliderItem', { read: ElementRef }) sliderItems!: QueryList<ElementRef>;

  selectStep(index: number) {
    this.activeStep.set(index);
    this.loadShow();
  }

  nextStep() {
    if (this.activeStep() < this.uploadSteps.length - 1) {
      this.activeStep.update(v => v + 1);
      this.loadShow();
    }
  }

  prevStep() {
    if (this.activeStep() > 0) {
      this.activeStep.update(v => v - 1);
      this.loadShow();
    }
  }

  ngAfterViewInit() {
    this.loadShow();
  }

  loadShow() {
    try {
      let stt = 0;
      const active = this.activeStep();
      const item = this.sliderItems.toArray()[active].nativeElement as HTMLElement;
      item.style.transform = 'none';
      item.style.zIndex = '10';
      item.style.filter = 'none';
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';

      for (let i = active + 1; i < this.uploadSteps.length; i++) {
        stt++;
        const el = this.sliderItems.toArray()[i].nativeElement as HTMLElement;
        el.style.transform = `translateX(${120 * stt}px) scale(${1 - 0.2 * stt}) perspective(10px)`;
        el.style.pointerEvents = 'none';
        el.style.zIndex = (5 - stt).toString();
        el.style.filter = `blur(${4 * stt}px)`;
        el.style.opacity = `${1 - 0.3 * stt}`;
      }
      stt = 0;
      for (let i = active - 1; i >= 0; i--) {
        stt++;
        const el = this.sliderItems.toArray()[i].nativeElement as HTMLElement;
        el.style.pointerEvents = 'none';
        el.style.transform = `translateX(${-120 * stt}px) scale(${1 - 0.2 * stt}) perspective(10px)`;
        el.style.zIndex = (5 - stt).toString();
        el.style.filter = `blur(${3 * stt}px)`;
        el.style.opacity = `${1 - 0.3 * stt}`;
      }
    } catch (error) {
      console.error('Error in loadShow:', error);
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