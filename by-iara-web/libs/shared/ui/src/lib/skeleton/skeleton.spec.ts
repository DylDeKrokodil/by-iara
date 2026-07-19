import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  let fixture: ComponentFixture<Skeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Skeleton],
    }).compileComponents();
    fixture = TestBed.createComponent(Skeleton);
  });

  it('renders a decorative placeholder with the configured dimensions', () => {
    fixture.componentRef.setInput('variant', 'block');
    fixture.componentRef.setInput('width', '12rem');
    fixture.componentRef.setInput('height', '4rem');
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector(
      '.skeleton',
    ) as HTMLElement;
    expect(element.classList).toContain('skeleton-block');
    expect(element.style.width).toBe('12rem');
    expect(element.style.height).toBe('4rem');
    expect(element.getAttribute('aria-hidden')).toBe('true');
  });
});
