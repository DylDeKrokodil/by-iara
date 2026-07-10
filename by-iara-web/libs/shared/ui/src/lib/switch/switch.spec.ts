import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Switch } from './switch';

describe('Switch', () => {
  let component: Switch;
  let fixture: ComponentFixture<Switch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Switch],
    }).compileComponents();

    fixture = TestBed.createComponent(Switch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('propagates checkbox changes through the CVA onChange callback', () => {
    let latest: boolean | undefined;
    component.registerOnChange((value: boolean) => (latest = value));
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(latest).toBe(true);
  });
});
