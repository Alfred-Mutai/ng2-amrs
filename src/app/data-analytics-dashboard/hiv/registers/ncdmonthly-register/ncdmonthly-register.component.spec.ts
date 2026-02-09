import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NcdmonthlyRegisterComponent } from './ncdmonthly-register.component';

describe('NcdmonthlyRegisterComponent', () => {
  let component: NcdmonthlyRegisterComponent;
  let fixture: ComponentFixture<NcdmonthlyRegisterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NcdmonthlyRegisterComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NcdmonthlyRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
