import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule, MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { getCurrentWindow } from '@tauri-apps/api/window';

// `ResizeDirection` is declared in @tauri-apps/api/window.d.ts but not
// exported from the package, so we inline the union for typing the handler.
type ResizeDirection =
  | 'East' | 'North' | 'NorthEast' | 'NorthWest'
  | 'South' | 'SouthEast' | 'SouthWest' | 'West';
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

  /** Begin a native window resize from one of the eight edge/corner handles.
   *  Only fires on the primary button so middle/right-click don't trigger a
   *  drag. The OS takes over until the user releases the button. */
  onResize(direction: ResizeDirection, event: MouseEvent): void {
    if (event.buttons !== 1) return;
    event.preventDefault();
    void getCurrentWindow().startResizeDragging(direction);
  }

  minimizeWindow(): void { void getCurrentWindow().minimize(); }
  toggleMaximize(): void { void getCurrentWindow().toggleMaximize(); }
  closeWindow(): void { void getCurrentWindow().close(); }
}