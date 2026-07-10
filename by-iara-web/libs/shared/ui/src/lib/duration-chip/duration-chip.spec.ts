import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DurationChip } from './duration-chip';

describe('DurationChip', () => {
  let component: DurationChip;
  let fixture: ComponentFixture<DurationChip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DurationChip],
    }).compileComponents();

    fixture = TestBed.createComponent(DurationChip);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', '30 min');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
