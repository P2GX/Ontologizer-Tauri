import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule, MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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