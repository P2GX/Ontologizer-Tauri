import { open } from '@tauri-apps/plugin-dialog';
import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { FilesService, FileStats, Stat } from '../../../services/files-service';
import { Tooltip } from '../../../shared/tooltip/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule, Tooltip],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
  standalone: true
})


export class FileUpload {

  constructor(private filesService: FilesService, private snackBar: MatSnackBar) { }
  label: string = 'Browse';
  @Input() processFileType!: keyof FileStats;
  @Input() num!: number;
  @Input() stepTitle!: string;
  @Input() subtitle!: string;
  @Input() dependenciesLoaded: boolean = true; // For study and pop files, depends on GAF being loaded
  @Input() triggerReload: number | null = 0; // For reprocessing when GAF is loaded
  @Output() uploadSuccess = new EventEmitter<void>();
  fileLoaded: boolean = false;
  fileLoading: boolean = false;
  filePath: string | null = null;
  fileName: string | null = null;
  fileStats: Stat[] = [];

  filters = {
    'go': { name: 'GO File', extensions: ['json'] },
    'annotation': { name: 'GAF File', extensions: ['gaf'] },
    'study': { name: 'Study gene File', extensions: ['txt'] },
    'pop': { name: 'Population gene File', extensions: ['txt'] }
  };

  ngOnChanges(changes: SimpleChanges) {
    // reprocess Study und Pop files when GAF is reloaded
    if (changes['triggerReload'] && !changes['triggerReload'].firstChange && this.filePath) {
      this.processFile(this.filePath);
    }
  }

  get stats(): Stat[] {
    return this.fileStats;
  }

  async openFileDialog() {
    try {
      this.filePath = await open({
        multiple: false,
        filters: this.filters[this.processFileType] ? [this.filters[this.processFileType]] : []
      });

      if (!this.filePath) return;

      if (this.filePath) {
        this.fileName = this.filePath.split(/[/\\]/).pop() ?? null;
        await this.processFile(this.filePath);
      }

    } catch (error) {
      console.error('Error opening file:', error);
      this.snackBar.open('Failed to open file dialog. Please try again.', 'Close', { panelClass: ['custom-snackbar'] });
    }
  }

  async processFile(path: string) {
    try {
      this.fileLoading = true;
      await this.filesService.processFile(path, this.processFileType);
      this.fileStats = this.filesService.getFileStatsForType(this.processFileType);

      if ((this.processFileType === 'pop' || this.processFileType === 'study')
        && Number(this.fileStats[0]?.value) === 0) {
        this.snackBar.open('⚠️ None of the uploaded genes have annotations in the current GAF file. Please check your files and try again.', 'Close', { panelClass: ['custom-snackbar'] });
      }

      this.fileLoaded = true;
      this.uploadSuccess.emit();
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      this.label = "Change File";
      this.fileLoading = false;
    }
  }

}

