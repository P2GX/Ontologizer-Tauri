import { Component, computed, effect, input, Output, EventEmitter } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RowData, FrequentistRowData } from '../../../services/results-service';

@Component({
  selector: 'app-result-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule
  ],
  standalone: true,
  templateUrl: './result-table.html',
  styleUrl: './result-table.css'
})
export class ResultTable {
  tableData = input.required<RowData[]>();
  isFrequentist = input<boolean>(false);
  totalCount = input<number>(0);

  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();

  dataSource = new MatTableDataSource<RowData>();

  displayedColumns = computed<string[]>(() =>
    this.isFrequentist()
      ? ['label', 'aspect', 'id', 'k', 'n', 'score']
      : ['label', 'aspect', 'id', 'score']
  );

  columnsToDisplayWithExpand = computed<string[]>(() => [...this.displayedColumns(), 'expand']);

  expandedElement: RowData | null = null;

  constructor() {
    effect(() => {
      this.dataSource.data = this.tableData();
    });
  }

  isExpanded(element: RowData) {
    return this.expandedElement === element;
  }

  toggle(element: RowData) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  asFrequentist(row: RowData): FrequentistRowData {
    return row as FrequentistRowData;
  }

  onPage(event: PageEvent) {
    this.pageChange.emit({ pageIndex: event.pageIndex, pageSize: event.pageSize });
  }

  isSignificant(value: number): boolean {
    if (isNaN(value)) return false;
    return this.isFrequentist() ? value < 0.05 : value >= 0.5;
  }

  formatScore(score: number): string {
    if (score < 0.001) return score.toExponential(2);
    return score.toFixed(4);
  }

  applyFilter(keyupEvent: Event): void {
    const inputValue = (keyupEvent.target as HTMLInputElement).value.toLowerCase();
    this.dataSource.filterPredicate = (data: RowData, filter: string) =>
      data.label.toLowerCase().includes(filter) ||
      data.id.toLowerCase().includes(filter) ||
      data.aspect.toLowerCase().includes(filter);
    this.dataSource.filter = inputValue;
  }
}
