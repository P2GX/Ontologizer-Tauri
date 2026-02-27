import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Legend } from './legend';

describe('Legend', () => {
  let component: Legend;
  let fixture: ComponentFixture<Legend>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Legend]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Legend);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
