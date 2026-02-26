import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { FileUpload } from './file-upload/file-upload';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SettingsService } from '../../services/settings-service';
import {FileStatus, FilesService, Stat} from '../../services/files-service';
import {invoke} from "@tauri-apps/api/core";

@Component({
  selector: 'app-files',
  imports: [FileUpload, CommonModule],
  templateUrl: './files.html',
  styleUrl: './files.css',
  standalone: true
})
export class Files implements AfterViewInit {

  // Inject the SettingsService to ensure that the initial settings (Term-for-Term, Bonferroni) are sent to the backend even if the user
  // never opens the Analysis page.
  constructor(private filesService: FilesService,
              private settingsService: SettingsService,
              private router: Router) {
    this.settingsService.startAutoSave();
  }

  // Track which files have been successfully loaded
  filesStatus: FileStatus = { study: false, pop: false, go: false, annotation: false };

  isProcessingAll = false;
  isFinished = false;
  uploadProgress = 0; // Progress from 0 to 100 indicating the overall upload progress
  activeStep = 0;
  triggerReload = 0; // if new GAF ist loaded, we need to reprocess the study and pop files before the analysis

  uploadSteps = [
    { type: 'go' as keyof FileStatus, title: 'Upload the Gene Ontology', subtitle: 'Accepted File Types: .json, .obo', dependsOn: null, fileLoaded: () => this.filesStatus.go },
    { type: 'annotation' as keyof FileStatus, title: 'Upload the Annotations', subtitle: 'Accepted File Types: .gaf', dependsOn: null, fileLoaded: () => this.filesStatus.annotation },
    { type: 'study' as keyof FileStatus, title: 'Upload the Study Gene Set', subtitle: 'Accepted File Types: .txt', dependsOn: 'annotation' as keyof FileStatus, fileLoaded: () => this.filesStatus.study },
    { type: 'pop' as keyof FileStatus, title: 'Upload the Population Gene Set', subtitle: 'Accepted File Types: .txt', dependsOn: 'annotation' as keyof FileStatus, fileLoaded: () => this.filesStatus.pop }
  ];

  onFileLoadedSuccess(fileType: keyof FileStatus) {
    if (!this.filesStatus[fileType]) {
      this.uploadProgress += 25;
    }

    this.filesStatus[fileType] = true;
    this.filesService.updateFileStatus({ [fileType]: true });

    // Special case: Annotation → trigger reload of study and pop files
    if (fileType === 'annotation') {
      this.triggerReload++;
    }
  }

  @ViewChildren('sliderItem', { read: ElementRef }) sliderItems!: QueryList<ElementRef>;

  selectStep(index: number) {
    this.activeStep = index;
    this.loadShow();
  }

  nextStep() {
    if (this.activeStep < this.uploadSteps.length - 1) {
      this.activeStep++;
      this.loadShow();
    }
  }

  prevStep() {
    if (this.activeStep > 0) {
      this.activeStep--;
      this.loadShow();
    }
  }

  ngAfterViewInit() {
    this.loadShow();
  }

  // Function for slider effect/animation
  loadShow() {
    try {
      let stt = 0;
      const itemRef = this.sliderItems.toArray()[this.activeStep];
      const item = (itemRef.nativeElement as HTMLElement);
      item.style.transform = 'none';
      item.style.zIndex = (10).toString();
      item.style.filter = 'none';
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';

      for (let i = this.activeStep + 1; i < this.uploadSteps.length; i++) {
        stt++;
        const itemRef = this.sliderItems.toArray()[i];
        const item = (itemRef.nativeElement as HTMLElement);

        item.style.transform = `translateX(${120 * stt}px) scale(${1 - 0.2 * stt}) perspective(10px) `;
        item.style.pointerEvents = 'none';
        item.style.zIndex = (5 - stt).toString();
        item.style.filter = `blur(${4 * stt}px)`;
        item.style.opacity = `${1 - 0.3 * stt}`;

      }
      stt = 0;
      for (let i = this.activeStep - 1; i >= 0; i--) {
        stt++;
        const itemRef = this.sliderItems.toArray()[i];
        const item = (itemRef.nativeElement as HTMLElement);
        item.style.pointerEvents = 'none';

        item.style.transform = `translateX(${-120 * stt}px) scale(${1 - 0.2 * stt}) perspective(10px) `;
        item.style.zIndex = (5 - stt).toString();
        item.style.filter = `blur(${3 * stt}px)`;
        item.style.opacity = `${1 - 0.3 * stt}`;
      }
    } catch (error) {
      console.error('Error in loadShow:', error);
    }
  }

  onResize = () => {
    this.loadShow();
  };

  async processFiles() {
    if (this.uploadProgress < 100) return;

    this.isProcessingAll = true;

    try {
      // Call the final command that consumes GoAnnotations and builds the Index
      const result = await invoke('build_annotation_index');
      console.log("Success:", result);

      this.isFinished = true;

      // Data is successfully loaded and indexed in AppState!
      // Ready to route the user to the next screen here!
      setTimeout(() => {
        this.router.navigate(['/settings']); // Adjust '/settings' if your route path is named differently
      }, 1500);

    } catch (error) {
      console.error("Error building annotation index:", error);
    } finally {
      this.isProcessingAll = false;
    }
  }
}