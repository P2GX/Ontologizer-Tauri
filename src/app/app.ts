import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule, MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FilesService } from './services/files-service';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDivider
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isCollapsed = signal(false);

  constructor(filesService: FilesService) {
    // Start loading the bundled Gene Ontology immediately on app start so it's
    // ready (or close to ready) by the time the user reaches the Files page.
    filesService.loadBundledGoFile();
  }

  toggleMenu(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  startDrag(event: MouseEvent): void {
    if (event.buttons === 1) void getCurrentWindow().startDragging();
  }

  minimizeWindow(): void { void getCurrentWindow().minimize(); }
  toggleMaximize(): void { void getCurrentWindow().toggleMaximize(); }
  closeWindow(): void { void getCurrentWindow().close(); }
}