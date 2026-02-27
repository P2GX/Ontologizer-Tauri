import { Component, ViewChild, AfterViewInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BayesianRowData } from '../../../services/results-service';

@Component({
  selector: 'app-bayesian-result-table',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule
  ],
  standalone: true,
  templateUrl: './bayesian-result-table.html',
  styleUrl: './bayesian-result-table.css'
})
export class BayesianResultTable implements OnChanges, AfterViewInit {
  @Input() tableData!: BayesianRowData[];

  displayedColumns: string[] = ['label', 'aspect', 'id', 'score'];
  columnsToDisplayWithExpand = [...this.displayedColumns, 'expand'];
  expandedElement: BayesianRowData | null = null;

  isExpanded(element: BayesianRowData) {
    return this.expandedElement === element;
  }

  toggle(element: BayesianRowData) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  resultsLength = 0;

  dataSource = new MatTableDataSource<BayesianRowData>();

  private viewInitialized = false;

  ngOnChanges(changes: SimpleChanges) {
    if (this.tableData && changes['tableData'] && this.viewInitialized) {
      this.dataSource.data = this.tableData;
      this.resultsLength = this.tableData.length;
    }
  }

  ngAfterViewInit() {
    if (this.tableData) {
      this.viewInitialized = true;
      this.dataSource.data = this.tableData;
      this.resultsLength = this.tableData.length;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.dataSource.sortingDataAccessor = (data: BayesianRowData, sortHeaderId: string) => {
        switch (sortHeaderId) {
          case 'score':
            return Number(data.score);
          default:
            const value = data[sortHeaderId as keyof BayesianRowData];
            return Array.isArray(value) ? '' : String(value).toUpperCase();
        }
      };

      this.sort.active = 'score';
      this.sort.direction = 'desc';
      this.sort.sortChange.emit({ active: 'score', direction: 'desc' });
    }
  }

  formatScore(score: number): string {
    return score.toFixed(3);
  }

  applyFilter(keyupEvent: Event): void {
    const inputElement = (keyupEvent.target as HTMLInputElement).value.toLowerCase();
    this.dataSource.filterPredicate = (data: BayesianRowData, filter: string) => {
      return data.label.toLowerCase().includes(filter) ||
             data.id.toLowerCase().includes(filter) ||
             data.aspect.toLowerCase().includes(filter);
    };
    this.dataSource.filter = inputElement;
  }
}
