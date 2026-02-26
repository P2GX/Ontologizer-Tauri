import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-legend',
  imports: [CommonModule],
  templateUrl: './legend.html',
  styleUrl: './legend.css'
})
export class Legend {
  legend = [
    { text: '≤ 0.05', color: "#f7dd60ff" },
    { text: '< 0.01', color: "#fcc469ff" },
    { text: '< 1e-3', color: '#fc8d59' },
    { text: '< 1e-4', color: '#e34a33' },
    { text: '< 1e-5', color: '#b30000' },
    { text: '< 1e-6', color: '#800000' }
  ];

}
