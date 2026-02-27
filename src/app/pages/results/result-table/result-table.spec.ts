import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultTable } from './result-table';

describe('ResultTable', () => {
  let component: ResultTable;
  let fixture: ComponentFixture<ResultTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
