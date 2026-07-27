import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '@by-iara/shared-ui';
import { Customers } from './customers';
import { CustomersApi } from './customers-api';

const customer = {
  id: 'customer-1',
  name: 'Ana Almeida',
  email: 'ana@example.com',
  phone: '+351 910 000 001',
  reservationCount: 4,
  completedReservationCount: 3,
  activeReservationCount: 1,
  lastCompletedAt: '2026-07-20T10:00:00Z',
  nextReservationAt: '2026-08-03T14:00:00Z',
  packs: [
    {
      id: 'pack-1',
      status: 'ACTIVE' as const,
      serviceName: 'Relaxing massage',
      durationMinutes: 60,
      totalSessions: 5,
      remainingSessions: 3,
      priceCents: 30000,
      currency: 'EUR',
      expiresAt: '2026-12-31T00:00:00Z',
    },
  ],
};

describe('Customers', () => {
  it('waits for an email prefix and renders matching customers', async () => {
    const api = {
      search: vi.fn(() =>
        of({ items: [customer], page: 0, size: 20, total: 1 }),
      ),
      anonymise: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [Customers],
      providers: [
        { provide: CustomersApi, useValue: api },
        {
          provide: ToastService,
          useValue: { show: vi.fn() },
        },
      ],
    });

    const fixture = TestBed.createComponent(Customers);
    fixture.detectChanges();

    expect(api.search).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Start with an email address',
    );

    fixture.componentInstance['searchControl'].setValue('ana@');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.search).toHaveBeenCalledWith('ana@', 0, 20);
    expect(fixture.nativeElement.textContent).toContain('Ana Almeida');
    expect(fixture.nativeElement.textContent).toContain('ana@example.com');
    expect(fixture.nativeElement.textContent).toContain('3 completed');
    expect(fixture.nativeElement.textContent).toContain('1 active');
    expect(fixture.nativeElement.textContent).toContain('Relaxing massage');
    expect(fixture.nativeElement.textContent).toContain(
      '3 of 5 sessions remaining',
    );
  });

  it('anonymises the selected customer and refreshes the search', async () => {
    const api = {
      search: vi.fn(() =>
        of({ items: [customer], page: 0, size: 20, total: 1 }),
      ),
      anonymise: vi.fn(() => of(undefined)),
    };
    const toast = { show: vi.fn() };

    TestBed.configureTestingModule({
      imports: [Customers],
      providers: [
        { provide: CustomersApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });

    const fixture = TestBed.createComponent(Customers);
    fixture.detectChanges();
    fixture.componentInstance['searchedEmail'].set('ana@');
    fixture.componentInstance['customerToAnonymise'].set(customer);

    fixture.componentInstance['confirmAnonymisation']();
    await fixture.whenStable();

    expect(api.anonymise).toHaveBeenCalledWith(customer.id);
    expect(api.search).toHaveBeenCalledWith('ana@', 0, 20);
    expect(toast.show).toHaveBeenCalledWith(
      'Customer personal data was anonymised.',
      'success',
    );
  });
});
