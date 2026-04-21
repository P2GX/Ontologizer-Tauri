import { Component, ChangeDetectionStrategy, inject, input, signal, computed } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import { FilesService } from '../../../services/files-service';
import { shortenPath } from '../../../shared/utils/path';
import { CardHeader } from '../../../shared/card-header/card-header';

@Component({
    selector: 'app-gene-card',
    imports: [CardHeader],
    templateUrl: './gene-card.html',
    styleUrl: './gene-card.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneCard {
    private filesService = inject(FilesService);

    cardTitle = input.required<string>();
    target = input.required<'study' | 'population'>();

    filePath = signal<string | null>(null);
    displayPath = signal<string | null>(null);

    fileName = computed(() => this.displayPath() ?? this.filePath()?.split(/[/\\]/).pop() ?? null);

    constructor() {
        void this.loadSavedPath();
    }

    private async loadSavedPath() {
        const config = await invoke<{ study_file: string | null; pop_file: string | null }>('get_config');
        const saved = this.target() === 'population' ? config.pop_file : config.study_file;
        if (!saved) return;

        const home = await homeDir();
        this.filePath.set(saved);
        this.displayPath.set(shortenPath(saved, home));
        this.filesService.setPath(this.target() === 'population' ? 'pop' : 'study', saved);
    }

    async openFileDialog() {
        const defaultPath = await homeDir();
        const path = await open({
            multiple: false,
            defaultPath,
            filters: [{ name: 'Gene File', extensions: ['txt'] }]
        });
        if (!path) return;

        const home = await homeDir();
        this.filePath.set(path as string);
        this.displayPath.set(shortenPath(path as string, home));

        const fileType = this.target() === 'population' ? 'pop' : 'study';
        const command = fileType === 'pop' ? 'set_population_file' : 'set_study_file';
        await invoke(command, { path });
        this.filesService.setPath(fileType, path as string);
    }
}
