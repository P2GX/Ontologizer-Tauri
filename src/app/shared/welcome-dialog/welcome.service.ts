import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ontologizer.welcomeSeen';

@Injectable({ providedIn: 'root' })
export class WelcomeService {
  readonly visible = signal<boolean>(this.firstLaunch());

  show(): void {
    this.visible.set(true);
  }

  dismiss(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage unavailable; dialog will reappear next launch.
    }
    this.visible.set(false);
  }

  private firstLaunch(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  }
}
