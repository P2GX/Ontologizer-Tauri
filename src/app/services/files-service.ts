import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
  providedIn: 'root'
})

// Service that handles file processing, tracks upload status, and stores file statistics.
export class FilesService {

  constructor() { }

  private fileStatus: FileStatus = {
    study: false,
    pop: false,
    go: false,
    annotation: false,
  };

  private fileStats: FileStats = {
    go: [],
    annotation: [],
    study: [],
    pop: []
  };

  getFileStats(): FileStats {
    return this.fileStats;
  }

  async processFile(path: string, fileType: keyof FileStats): Promise<void> {
    try {
      let newStats: Stat[] = [];
      let jsonData: string;
      console.log(`Processing file of type ${fileType} at path ${path}`);
      switch (fileType) {
        case 'go':
          jsonData = await invoke<string>('process_go_file', { path });
          console.log('GO file processing result:', jsonData);
          break;
        case 'annotation':
          jsonData = await invoke<string>('process_gaf_file', { path });
          break;
        case 'study':
          jsonData = await invoke<string>('process_gene_file', { path, target: 'study' });
          break;
        case 'pop':
          jsonData = await invoke<string>('process_gene_file', { path, target: 'population' });
          break;
        default:
          throw new Error('Unkown file type');
      }
      newStats = JSON.parse(jsonData);
      console.log(`File stats for ${fileType}:`, newStats);
      this.fileStats[fileType] = newStats;
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the file format and try again.');
    }
  }

  getFileStatsForType(fileType: keyof FileStats): Stat[] {
    return this.fileStats[fileType];
  }

  getGoTermsCount() {
    return Number(this.fileStats.go[1].value) || 0;
  }

  getFileStatus(): FileStatus {
    return { ...this.fileStatus };
  }

  getStudyGenesCount(): number {
    return Number(this.fileStats.study[0].value) || 0;
  }

  getPopGenesCount(): number {
    return Number(this.fileStats.pop[0].value) || 0;
  }

  updateFileStatus(newStatus: Partial<FileStatus>) {
    this.fileStatus = { ...this.fileStatus, ...newStatus };
  }

}
export interface FileStatus {
  study: boolean;
  pop: boolean;
  go: boolean;
  annotation: boolean;
}

// A stat is a key-value pair representing a statistic about a file --> one row in the file stats table
export interface Stat {
  key: string;
  value: string;
}

export interface FileStats {
  go: Stat[];
  annotation: Stat[];
  study: Stat[];
  pop: Stat[];
}