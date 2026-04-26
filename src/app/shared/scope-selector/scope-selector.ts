import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, HostListener, ElementRef
} from '@angular/core';

type Slot = 'size' | 'aspect' | 'statistic';

@Component({
  selector: 'app-scope-selector',
  imports: [],
  templateUrl: './scope-selector.html',
  styleUrl: './scope-selector.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScopeSelector {
  @Input() sizeOptions: string[] = [];
  @Input() selectedSize: string = '';
  @Input() aspectOptions: string[] = [];
  @Input() selectedAspect: string = '';

  /** Optional third slot. When `statisticOptions` is non-empty the sentence reads "...by {statistic}". */
  @Input() statisticOptions: string[] | null = null;
  @Input() selectedStatistic: string = '';
  @Input() statisticDisplayNames: Record<string, string> = {};

  @Output() sizeChange = new EventEmitter<string>();
  @Output() aspectChange = new EventEmitter<string>();
  @Output() statisticChange = new EventEmitter<string>();

  openDropdown: Slot | null = null;

  constructor(private elementRef: ElementRef) {}

  toggle(which: Slot): void {
    this.openDropdown = this.openDropdown === which ? null : which;
  }

  select(option: string, which: Slot): void {
    if (which === 'size') this.sizeChange.emit(option);
    else if (which === 'aspect') this.aspectChange.emit(option);
    else this.statisticChange.emit(option);
    this.openDropdown = null;
  }

  /** Display name for a statistic option (falls back to the raw key). */
  statLabel(option: string): string {
    return this.statisticDisplayNames[option] ?? option;
  }

  onTokenKeydown(event: KeyboardEvent, which: Slot): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle(which);
    }
  }

  onOptionKeydown(event: KeyboardEvent, option: string, which: Slot): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select(option, which);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.openDropdown) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.openDropdown = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openDropdown = null;
  }
}
