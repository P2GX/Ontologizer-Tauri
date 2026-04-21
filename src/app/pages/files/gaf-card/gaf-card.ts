import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FilesService } from '../../../services/files-service';
import { CardHeader } from '../../../shared/card-header/card-header';
import { DropdownMenu } from '../../../shared/dropdown-menu/dropdown-menu';
import { shortenPath } from '../../../shared/utils/path';

@Component({
    selector: 'app-gaf-card',
    imports: [CardHeader, DropdownMenu],
    templateUrl: './gaf-card.html',
    styleUrl: './gaf-card.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GafCard {
    private filesService = inject(FilesService);
    private snackBar = inject(MatSnackBar);

    filePath = signal<string | null>(null);
    displayPath = signal<string | null>(null);
    downloading = signal(false);
    version = signal<string | null>(null);
    organisms = signal<string[]>([]);
    selectedOrganism = signal<string | null>(null);

    fileName = computed(() => this.displayPath() ?? this.filePath()?.split(/[/\\]/).pop() ?? null);

    constructor() {
        void this.loadInitialData();
    }

    private async loadInitialData() {
        const [organisms, config] = await Promise.all([
            invoke<string[]>('get_available_organisms'),
            invoke<{ gaf_file: string | null }>('get_config')
        ]);

        this.organisms.set(organisms);
        if (organisms.length > 0) this.selectedOrganism.set(organisms[0]);

        if (config.gaf_file) {
            const home = await homeDir();
            this.filePath.set(config.gaf_file);
            this.displayPath.set(shortenPath(config.gaf_file, home));
            this.filesService.setPath('annotation', config.gaf_file);
            void this.loadDate(config.gaf_file);
        }
    }

    private async loadDate(path: string) {
        try {
            const date = await invoke<string>('get_gaf_date', { path });
            this.version.set(date.slice(0, 10));
        } catch {
            // version remains null if extraction fails
        }
    }

    async onOrganismChange(organism: string) {
        this.selectedOrganism.set(organism);
        await this.downloadGaf();
    }

    async downloadGaf() {
        const organism = this.selectedOrganism();
        if (!organism) return;

        this.downloading.set(true);
        try {
            await invoke('download_gaf', { organism });
            const config = await invoke<{ gaf_file: string | null }>('get_config');
            const path = config.gaf_file;
            if (!path) return;
            const home = await homeDir();
            this.filePath.set(path);
            this.displayPath.set(shortenPath(path, home));
            await invoke('set_gaf_file', { path });
            this.filesService.setPath('annotation', path);
            this.version.set(null);
            void this.loadDate(path);
        } catch (error) {
            this.snackBar.open(`Download failed: ${error}`, 'Close', { panelClass: ['custom-snackbar'] });
        } finally {
            this.downloading.set(false);
        }
    }

    async openFileDialog() {
        const defaultPath = await homeDir();
        const path = await open({
            multiple: false,
            defaultPath,
            filters: [{ name: 'GAF File', extensions: ['gaf', 'gz'] }]
        });
        if (!path) return;

        const home = await homeDir();
        this.filePath.set(path as string);
        this.displayPath.set(shortenPath(path as string, home));
        await invoke('set_gaf_file', { path });
        this.filesService.setPath('annotation', path as string);
        this.version.set(null);
        void this.loadDate(path as string);
    }
}
