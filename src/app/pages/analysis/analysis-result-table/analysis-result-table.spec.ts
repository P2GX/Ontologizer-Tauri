import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisResultTable } from './analysis-result-table';

describe('AnalysisResultTable', () => {
  let component: AnalysisResultTable;
  let fixture: ComponentFixture<AnalysisResultTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisResultTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisResultTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
