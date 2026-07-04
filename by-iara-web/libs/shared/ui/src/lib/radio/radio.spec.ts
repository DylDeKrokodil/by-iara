import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Radio } from './radio';

describe('Radio', () => {
  let component: Radio;
  let fixture: ComponentFixture<Radio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Radio],
    }).compileComponents();

    fixture = TestBed.createComponent(Radio);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Pay at studio');
    fixture.componentRef.setInput('name', 'payment');
    fixture.componentRef.setInput('value', 'studio');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits its value on checkedChange when selected', () => {
    fixture.detectChanges();
    let emitted: string | undefined;
    component.checkedChange.subscribe((value) => (emitted = value));

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(emitted).toBe('studio');
  });
});
