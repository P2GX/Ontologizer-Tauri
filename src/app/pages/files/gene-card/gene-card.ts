import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FilesService, Stat } from '../../../services/files-service';

@Component({
    selector: 'app-gene-card',
    imports: [],
    templateUrl: './gene-card.html',
    styleUrl: './gene-card.css',
    standalone: true
})
export class GeneCard {
    private filesService = inject(FilesService);

    @Input() title!: string;
    @Input() subtitle!: string;
    @Input() target!: 'study' | 'population';
    @Input() dependenciesLoaded = true;
    @Output() uploadSuccess = new EventEmitter<void>();

    filePath = signal<string | null>(null);
    fileLoading = signal(false);
    fileStats = signal<Stat[]>([]);

    get icon(): string {
        return this.target === 'population' ? 'groups' : 'biotech';
    }

    get description(): string {
        return this.target === 'population'
            ? 'All genes in the background set — used as the reference for statistical enrichment testing.'
            : 'Genes of interest to be tested for GO term enrichment against the background set.';
    }

    get fileName(): string | null {
        const p = this.filePath();
        if (!p) return null;
        return p.split(/[/\\]/).pop() ?? p;
    }

    get geneCount(): string | null {
        const stats = this.fileStats();
        return stats.length > 0 ? stats[0].value : null;
    }

    async openFileDialog() {
        const path = await open({
            multiple: false,
            filters: [{ name: 'Gene File', extensions: ['txt'] }]
        });
        if (!path) return;
        this.filePath.set(path as string);
        await this.processFile(path as string);
    }

    private async processFile(path: string) {
        this.fileLoading.set(true);
        try {
            const fileType = this.target === 'population' ? 'pop' : 'study';
            await this.filesService.processFile(path, fileType);
            this.fileStats.set(this.filesService.getFileStatsForType(fileType));
            this.uploadSuccess.emit();
        } finally {
            this.fileLoading.set(false);
        }
    }
}
