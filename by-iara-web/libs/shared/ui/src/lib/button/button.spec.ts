import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  let component: Button;
  let fixture: ComponentFixture<Button>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button],
    }).compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a native button by default and an anchor when routerLink is set', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();

    fixture.componentRef.setInput('routerLink', '/services');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();
  });
});
