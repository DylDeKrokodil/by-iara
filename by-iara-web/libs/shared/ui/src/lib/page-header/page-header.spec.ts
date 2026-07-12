import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  let component: PageHeader;
  let fixture: ComponentFixture<PageHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Reservations');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the admin label and spacing mode', async () => {
    fixture.componentRef.setInput('label', 'Schedule');
    fixture.componentRef.setInput('admin', true);
    await fixture.whenStable();

    const header = fixture.nativeElement.querySelector('header');
    expect(header.classList.contains('admin-page-header')).toBe(true);
    expect(fixture.nativeElement.querySelector('.page-label').textContent).toContain('Schedule');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Reservations');
  });
});
