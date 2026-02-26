import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Files } from './files';

describe('Files', () => {
  let component: Files;
  let fixture: ComponentFixture<Files>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Files]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Files);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
