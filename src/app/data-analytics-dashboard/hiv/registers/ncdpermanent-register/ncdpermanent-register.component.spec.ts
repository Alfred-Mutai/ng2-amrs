import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NcdpermanentRegisterComponent } from './ncdpermanent-register.component';

describe('NcdpermanentRegisterComponent', () => {
  let component: NcdpermanentRegisterComponent;
  let fixture: ComponentFixture<NcdpermanentRegisterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NcdpermanentRegisterComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NcdpermanentRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
