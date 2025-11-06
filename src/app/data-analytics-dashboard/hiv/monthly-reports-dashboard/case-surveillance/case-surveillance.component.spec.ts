import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseSurveillanceComponent } from './case-surveillance.component';

describe('CaseSurveillanceComponent', () => {
  let component: CaseSurveillanceComponent;
  let fixture: ComponentFixture<CaseSurveillanceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CaseSurveillanceComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CaseSurveillanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
