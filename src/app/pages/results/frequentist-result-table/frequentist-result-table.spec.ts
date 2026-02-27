import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrequentistResultTable } from './frequentist-result-table';

describe('FrequentistResultTable', () => {
  let component: FrequentistResultTable;
  let fixture: ComponentFixture<FrequentistResultTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrequentistResultTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FrequentistResultTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
