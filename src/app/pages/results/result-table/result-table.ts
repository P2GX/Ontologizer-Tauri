import { Component, computed, effect, input, signal, Output, EventEmitter } from '@angular/core';
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

  /** Drives both the search input's displayed value and the dataSource filter,
   *  so external triggers (e.g. "Show in Table" from the GO graph tooltip)
   *  can update the filter while keeping the input in sync. */
  searchText = signal('');

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

    // Filter predicate is stable — set once. The effect below drives the
    // actual filter string from searchText so any source (typed input or
    // external trigger) flows through one place.
    this.dataSource.filterPredicate = (data: RowData, filter: string) =>
      data.label.toLowerCase().includes(filter) ||
      data.id.toLowerCase().includes(filter) ||
      data.aspect.toLowerCase().includes(filter);

    effect(() => {
      this.dataSource.filter = this.searchText().toLowerCase();
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
    this.searchText.set((keyupEvent.target as HTMLInputElement).value);
  }

  /** Filter the table down to a specific GO term id. Called from the GO graph
   *  tooltip's "Show in Table" action. */
  filterByTermId(id: string): void {
    this.searchText.set(id);
  }
}
