import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AvailabilityApi } from '../availability/availability-api';
import { ReservationPage, ReservationResponse } from '../reservations/reservation.models';
import { ReservationsApi } from '../reservations/reservations-api';
import { Dashboard } from './dashboard';

function reservation(id: string, status: ReservationResponse['status']): ReservationResponse {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  return {
    id,
    status,
    serviceId: null,
    serviceVariantId: null,
    serviceName: 'Relaxing massage',
    durationMinutes: 60,
    price: { amountCents: 6000, currency: 'EUR' },
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
    customer: { name: 'Ana Silva', email: 'ana@example.com', phone: null },
    notes: null,
  };
}

function page(items: ReservationResponse[], total = items.length): ReservationPage {
  return { items, page: 0, size: 100, total };
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let reservationsApi: { list: ReturnType<typeof vi.fn> };
  let availabilityApi: {
    listRules: ReturnType<typeof vi.fn>;
    listBlocks: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const pending = reservation('pending-1', 'PENDING');
    const confirmed = reservation('confirmed-1', 'CONFIRMED');
    let requestIndex = 0;

    reservationsApi = {
      list: vi.fn(() => {
        requestIndex += 1;
        if (requestIndex === 1) return of(page([pending]));
        return of(page([confirmed]));
      }),
    };
    availabilityApi = {
      listRules: vi.fn(() => of([{ id: 'rule-1', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' }])),
      listBlocks: vi.fn(() => of([])),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: ReservationsApi, useValue: reservationsApi },
        { provide: AvailabilityApi, useValue: availabilityApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
  });

  it('loads operational data and renders pending and scheduled reservations', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(reservationsApi.list).toHaveBeenCalledTimes(3);
    expect(availabilityApi.listRules).toHaveBeenCalledOnce();
    expect(availabilityApi.listBlocks).toHaveBeenCalledOnce();
    expect(text).toContain('Needs attention');
    expect(text).toContain('Ana Silva');
    expect(text).toContain('Today’s schedule');
    expect(text).toContain('Relaxing massage');
  });

  it('shows useful empty states when no reservations need attention', () => {
    reservationsApi.list.mockImplementation(() => of(page([])));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('You’re all caught up');
    expect(text).toContain('No confirmed appointments today');
    expect(text).toContain('No confirmed bookings in the next seven days');
  });

  it('shows a recoverable error when dashboard data cannot load', () => {
    reservationsApi.list.mockImplementation(() => throwError(() => new Error('offline')));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load today’s operations.');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });
});
