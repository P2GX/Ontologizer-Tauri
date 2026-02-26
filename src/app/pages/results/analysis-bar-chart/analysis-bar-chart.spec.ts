import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisBarChart } from './analysis-bar-chart';

describe('AnalysisBarChart', () => {
  let component: AnalysisBarChart;
  let fixture: ComponentFixture<AnalysisBarChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisBarChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisBarChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
