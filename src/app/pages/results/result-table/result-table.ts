import { Component, ViewChild, AfterViewInit, computed, effect, input, Output, EventEmitter } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RowData, FrequentistRowData } from '../../../services/results-service';

@Component({
  selector: 'app-result-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
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
  sortDirection = input<'asc' | 'desc'>('asc');
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

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    // Do NOT connect paginator to dataSource — server-side pagination
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (data: RowData, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'score':
          return Number(data.score);
        case 'k':
          return Number((data as FrequentistRowData).k);
        case 'n':
          return Number((data as FrequentistRowData).n);
        default:
          const value = data[sortHeaderId as keyof RowData];
          return Array.isArray(value) ? '' : String(value).toUpperCase();
      }
    };

    const dir = this.sortDirection();
    this.sort.active = 'score';
    this.sort.direction = dir;
    this.sort.sortChange.emit({ active: 'score', direction: dir });
  }

  isSignificant(value: number): boolean {
    return !isNaN(value) && value < 0.05;
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
