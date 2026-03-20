import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { openUrl } from '@tauri-apps/plugin-opener';

@Component({
  selector: 'app-about',
  imports: [MatDividerModule, CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {

  selectedTab = 'introduction';


  async selectTab(tab: string) {
    this.selectedTab = tab;
  }

  async openExternalLink(url: string) {
    console.log("OPen", url);
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  }

}
