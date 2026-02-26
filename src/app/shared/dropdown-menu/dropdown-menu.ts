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
  @Input() selected = '';
  @Output() selectedChange = new EventEmitter<string>();

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

