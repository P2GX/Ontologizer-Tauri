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
        if (organisms.length > 0) {
            this.selectedOrganism.set(organisms[0]);
            this.filesService.gafOrganism.set(organisms[0]);
        }

        if (config.gaf_file) {
            // The default config seeds gaf_file with the canonical download
            // target before anything has been downloaded; only mark the card
            // as ready once that file actually exists on disk.
            const exists = await invoke<boolean>('path_exists', { path: config.gaf_file });
            if (exists) {
                await this.applyFile(config.gaf_file);
            }
        }
    }

    private async loadDate(path: string) {
        try {
            const date = await invoke<string>('get_gaf_date', { path });
            const short = date.slice(0, 10);
            this.version.set(short);
            this.filesService.gafVersion.set(short);
        } catch {
            // version remains null if extraction fails
        }
    }

    /** Mark the card as ready for `path`: updates local signals, the shared
     *  FilesService, writes the path into the persisted config, clears the
     *  gene-list pair (they belong to the previous annotation), and loads
     *  the file's date. Shared between download, manual pick, and
     *  organism-switch-with-existing-file paths. */
    private async applyFile(path: string) {
        const home = await homeDir();
        this.filePath.set(path);
        this.displayPath.set(shortenPath(path, home));
        this.version.set(null);
        this.filesService.gafVersion.set(null);
        this.filesService.setPath('annotation', path);
        try {
            await invoke('set_gaf_file', { path });
        } catch (error) {
            console.error('Failed to persist GAF path:', error);
        }
        this.filesService.clearGeneFiles();
        void this.loadDate(path);
    }

    /** Reset the card to the empty "No file selected" state and clear the
     *  persisted gaf_file (plus pop/study) so the rest of the app cannot
     *  silently analyse against a stale annotation belonging to a different
     *  organism. */
    private async clearFile() {
        this.filePath.set(null);
        this.displayPath.set(null);
        this.version.set(null);
        this.filesService.annotationPath.set(null);
        this.filesService.gafVersion.set(null);
        this.filesService.clearGeneFiles();
        try {
            await invoke('clear_gaf_file');
        } catch (error) {
            console.error('Failed to clear GAF path:', error);
        }
    }

    async onOrganismChange(organism: string) {
        this.selectedOrganism.set(organism);
        this.filesService.gafOrganism.set(organism);
        try {
            const existing = await invoke<string | null>('find_existing_gaf_for_organism', { organism });
            if (existing) {
                await this.applyFile(existing);
            } else {
                await this.clearFile();
            }
        } catch (error) {
            console.error('Could not look up GAF for organism:', error);
            await this.clearFile();
        }
    }

    async downloadGaf() {
        const organism = this.selectedOrganism();
        if (!organism) return;

        this.downloading.set(true);
        try {
            await invoke('download_gaf', { organism });
            const config = await invoke<{ gaf_file: string | null }>('get_config');
            if (config.gaf_file) await this.applyFile(config.gaf_file);
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
        await this.applyFile(path as string);
    }
}
