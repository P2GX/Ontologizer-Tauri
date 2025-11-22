import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
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

}
