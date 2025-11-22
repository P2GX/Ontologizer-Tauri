import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Analysis } from './analysis';

describe('Analysis', () => {
  let component: Analysis;
  let fixture: ComponentFixture<Analysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analysis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Analysis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
