import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FilesService } from '../../../services/files-service';
import { CardHeader } from '../../../shared/card-header/card-header';
import { shortenPath } from '../../../shared/utils/path';

@Component({
    selector: 'app-go-card',
    imports: [CardHeader],
    templateUrl: './go-card.html',
    styleUrl: './go-card.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoCard {
    private filesService = inject(FilesService);
    private snackBar = inject(MatSnackBar);

    filePath = signal<string | null>(null);
    displayPath = signal<string | null>(null);
    downloading = signal(false);
    version = signal<string | null>(null);

    fileName = computed(() => this.displayPath() ?? this.filePath()?.split(/[/\\]/).pop() ?? null);

    private configGoPath = signal<string | null>(null);

    constructor() {
        void this.loadSavedPath();
    }

    private async loadSavedPath() {
        const config = await invoke<{ go_file: string | null }>('get_config');
        if (!config.go_file) return;

        this.configGoPath.set(config.go_file);
        const home = await homeDir();
        this.filePath.set(config.go_file);
        this.displayPath.set(shortenPath(config.go_file, home));
        this.filesService.setPath('go', config.go_file);
        this.filesService.startGoBackgroundLoad(config.go_file);
        void this.loadDate(config.go_file);
    }

    private async loadDate(path: string) {
        try {
            const date = await invoke<string>('get_go_date', { path });
            this.version.set(date);
        } catch {
            // version remains null if extraction fails
        }
    }

    async downloadLatest() {
        this.downloading.set(true);
        try {
            await invoke('download_go');
            const path = this.configGoPath();
            if (!path) return;
            const home = await homeDir();
            this.filePath.set(path);
            this.displayPath.set(shortenPath(path, home));
            await invoke('set_go_file', { path });
            this.filesService.setPath('go', path);
            this.version.set(null);
            this.filesService.startGoBackgroundLoad(path);
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
            filters: [{ name: 'GO File', extensions: ['json'] }]
        });
        if (!path) return;

        const home = await homeDir();
        this.filePath.set(path as string);
        this.displayPath.set(shortenPath(path as string, home));
        await invoke('set_go_file', { path });
        this.filesService.setPath('go', path as string);
        this.version.set(null);
        this.filesService.startGoBackgroundLoad(path as string);
        void this.loadDate(path as string);
    }
}
