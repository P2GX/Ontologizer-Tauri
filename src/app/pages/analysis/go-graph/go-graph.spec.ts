import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoGraph } from './go-graph';

describe('GoGraph', () => {
  let component: GoGraph;
  let fixture: ComponentFixture<GoGraph>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoGraph]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoGraph);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
