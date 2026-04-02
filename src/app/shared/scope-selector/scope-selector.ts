import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, HostListener, ElementRef
} from '@angular/core';

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

  @Output() sizeChange = new EventEmitter<string>();
  @Output() aspectChange = new EventEmitter<string>();

  openDropdown: 'size' | 'aspect' | null = null;

  constructor(private elementRef: ElementRef) {}

  toggle(which: 'size' | 'aspect'): void {
    this.openDropdown = this.openDropdown === which ? null : which;
  }

  select(option: string, which: 'size' | 'aspect'): void {
    if (which === 'size') this.sizeChange.emit(option);
    else this.aspectChange.emit(option);
    this.openDropdown = null;
  }

  onTokenKeydown(event: KeyboardEvent, which: 'size' | 'aspect'): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle(which);
    }
  }

  onOptionKeydown(event: KeyboardEvent, option: string, which: 'size' | 'aspect'): void {
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
