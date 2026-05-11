import { Component, computed, effect, input, signal, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
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
export class ResultTable implements AfterViewInit {
  tableData = input.required<RowData[]>();
  isFrequentist = input<boolean>(false);
  totalCount = input<number>(0);

  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  /** Debounced search input — parent listens and forwards to the service,
   *  which asks Rust to filter across the full result set. */
  @Output() searchChange = new EventEmitter<string>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  dataSource = new MatTableDataSource<RowData>();

  /** Drives the search input's displayed value so programmatic triggers
   *  ("Show in Table" from the GO graph tooltip) appear in the box too. */
  searchText = signal('');

  /** Debounce window for the search input. Long enough to avoid an IPC
   *  per keystroke; short enough that the table feels responsive. */
  private static readonly SEARCH_DEBOUNCE = 200;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

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

  ngAfterViewInit(): void {
    // Paginator is captured here so search/jumpToPage paths can reset it
    // to page 0 — its (page) event continues to bubble through onPage.
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
    const value = (keyupEvent.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.scheduleSearchEmit(value);
  }

  /** Filter the table down to a specific GO term id. Called from the GO graph
   *  tooltip's "Show in Table" action — fires immediately (no debounce). */
  filterByTermId(id: string): void {
    this.searchText.set(id);
    if (this.searchDebounce !== null) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.emitSearch(id);
  }

  private scheduleSearchEmit(value: string): void {
    if (this.searchDebounce !== null) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.searchDebounce = null;
      this.emitSearch(value);
    }, ResultTable.SEARCH_DEBOUNCE);
  }

  private emitSearch(value: string): void {
    // Snap the paginator UI back to page 0 — the new result set has a fresh
    // filtered total, and the parent has already requested page 0 of data.
    if (this.paginator) this.paginator.pageIndex = 0;
    this.searchChange.emit(value);
  }
}
