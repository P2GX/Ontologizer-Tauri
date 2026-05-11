import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { openUrl } from '@tauri-apps/plugin-opener';

@Component({
  selector: 'app-help',
  imports: [MatDividerModule, CommonModule],
  templateUrl: './help.html',
  styleUrl: './help.css'
})
export class Help {

  selectedTab = 'introduction';

  async selectTab(tab: string) {
    this.selectedTab = tab;
  }

  async openExternalLink(url: string) {
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  }

}
