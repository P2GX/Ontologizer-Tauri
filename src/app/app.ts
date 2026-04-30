import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule, MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WelcomeDialog } from './shared/welcome-dialog/welcome-dialog';
import { WelcomeService } from './shared/welcome-dialog/welcome.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDivider,
    WelcomeDialog
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly welcome = inject(WelcomeService);

  isCollapsed = signal(false);

  toggleMenu(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  showWelcome(): void {
    this.welcome.show();
  }

  startDrag(event: MouseEvent): void {
    if (event.buttons === 1) void getCurrentWindow().startDragging();
  }

  minimizeWindow(): void { void getCurrentWindow().minimize(); }
  toggleMaximize(): void { void getCurrentWindow().toggleMaximize(); }
  closeWindow(): void { void getCurrentWindow().close(); }
}