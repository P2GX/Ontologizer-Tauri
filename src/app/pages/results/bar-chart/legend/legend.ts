import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-legend',
  imports: [],
  templateUrl: './legend.html',
  styleUrl: './legend.css'
})
export class Legend {
  @Input() maxValue: number = 6;
  @Input() isBayesian: boolean = false;

  // Always exactly 7 evenly-spaced ticks: 0, max/6, 2*max/6, ..., max
  get ticks(): { label: string; position: number }[] {
    const max = this.maxValue;
    return Array.from({ length: 7 }, (_, i) => {
      const val = (i / 6) * max;
      const label = val === 0 ? '0' : val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
      return { label, position: (i / 6) * 100 };
    });
  }
}
