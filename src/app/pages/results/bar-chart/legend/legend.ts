import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-legend',
  imports: [],
  templateUrl: './legend.html',
  styleUrl: './legend.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Legend {
  @Input() maxValue: number = 6;
  @Input() isBayesian: boolean = false;

  get maxLabel(): string {
    const v = this.maxValue;
    return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
  }
}
