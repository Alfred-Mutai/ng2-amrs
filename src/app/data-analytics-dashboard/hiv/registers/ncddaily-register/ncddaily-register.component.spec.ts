import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NcddailyRegisterComponent } from './ncddaily-register.component';

describe('NcddailyRegisterComponent', () => {
  let component: NcddailyRegisterComponent;
  let fixture: ComponentFixture<NcddailyRegisterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NcddailyRegisterComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NcddailyRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
