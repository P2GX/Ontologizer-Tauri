import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Setup } from './setup';

describe('Setup', () => {
  let component: Setup;
  let fixture: ComponentFixture<Setup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Setup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Setup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
