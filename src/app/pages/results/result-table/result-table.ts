import { Component, ViewChild, AfterViewInit, Input, SimpleChanges, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {FrequentistRowData} from '../../../services/results-service';

@Component({
  selector: 'app-result-table',
  imports: [
    CommonModule,
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
export class ResultTable implements OnChanges, AfterViewInit {
  @Input() tableData!: FrequentistRowData[];

  displayedColumns: string[] = [
    'label',
    'aspect',
    'id',
    'k',
    'n',
    'p_val',
  ];
  columnsToDisplayWithExpand = [...this.displayedColumns, 'expand'];
  expandedElement: FrequentistRowData | null = null;

  isExpanded(element: FrequentistRowData) {
    return this.expandedElement === element;
  }

  toggle(element: FrequentistRowData) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  resultsLength = 0;

  dataSource = new MatTableDataSource<FrequentistRowData>();


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

      this.dataSource.sortingDataAccessor = (
        data: FrequentistRowData,
        sortHeaderId: string
      ) => {

        switch (sortHeaderId) {
          case 'p_val':
          case 'k':
          case 'n':
            return Number(data[sortHeaderId as keyof FrequentistRowData]);
          default:
            const value = data[sortHeaderId as keyof FrequentistRowData];
            // if value is an array (annotated study genes of term), return empty, else return uppercased string
            return Array.isArray(value) ? '' : String(value).toUpperCase();
        }
      };
    }
  }

  private viewInitialized = false;

  isSignificant(value: any): boolean {
    const numValue = Number(value);
    return !isNaN(numValue) && numValue < 0.05;
  }

  formatPValue(p: number): string {
    if (p < 0.001) {
      return p.toExponential(2);
    } else {
      return p.toFixed(4);
    }
  }

  // Function to apply filter on the table data (search functionality)
  applyFilter(keyupEvent: Event): void {
    const inputElement = (keyupEvent.target as HTMLInputElement).value.toLowerCase();
    // only search in rows that are always shown, not in expanded details
    // filterPredicate defines how the filter is applied on each row
    this.dataSource.filterPredicate = (data: FrequentistRowData, inputElement: string) => {
      return data.label.toLowerCase().includes(inputElement) ||
              data.id.toLowerCase().includes(inputElement) ||
              data.aspect.toLowerCase().includes(inputElement);
    };

    this.dataSource.filter = inputElement;
  }

}