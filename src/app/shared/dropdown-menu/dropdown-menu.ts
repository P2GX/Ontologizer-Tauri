import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, HostListener, ElementRef
} from '@angular/core';

@Component({
  selector: 'app-dropdown-menu',
  imports: [],
  templateUrl: './dropdown-menu.html',
  styleUrl: './dropdown-menu.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownMenu {
  @Input() label = '';
  @Input() options: string[] = [];
  @Input() selected: string | null = null;
  @Input() displayNames: Record<string, string> = {};
  @Output() selectedChange = new EventEmitter<string>();

  menuOpen = false;
  readonly menuId = `select-menu-${Math.random().toString(36).slice(2)}`;

  constructor(private elementRef: ElementRef) {}

  get isFilled(): boolean {
    // Always true so the label floats up and the dash placeholder is visible
    return true;
  }

  displayOf(value: string | null): string {
    return value ? (this.displayNames[value] ?? value) : '–';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  selectOption(option: string): void {
    this.menuOpen = false;
    this.selectedChange.emit(option);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleMenu();
    }
  }

  onOptionKeydown(event: KeyboardEvent, option: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectOption(option);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
  }
}
