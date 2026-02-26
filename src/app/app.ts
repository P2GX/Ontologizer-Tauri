import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule, MatDivider } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
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
  protected readonly title = signal('ontologizer');

  // New signal to track if the sidebar is shrunken down to icons
  isCollapsed = signal(false);

  constructor(private router: Router) { }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Toggle function for the burger menu
  toggleMenu(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }
}