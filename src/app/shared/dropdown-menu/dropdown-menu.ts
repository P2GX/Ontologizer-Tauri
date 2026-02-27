import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-dropdown-menu',
  imports: [CommonModule],
  templateUrl: './dropdown-menu.html',
  styleUrl: './dropdown-menu.css',
  standalone: true
})
export class DropdownMenu {
  @Input() label = '';
  @Input() options: string[] = [];
  @Input() selected: string | null = null;
  @Input() displayNames: Record<string, string> = {};
  @Output() selectedChange = new EventEmitter<string>();

  displayOf(value: string | null): string {
    return value ? (this.displayNames[value] ?? value) : '';
  }

  menuOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  selectOption(option: string) {
    this.selected = option;
    this.menuOpen = false;
    this.selectedChange.emit(option);
  }
}

