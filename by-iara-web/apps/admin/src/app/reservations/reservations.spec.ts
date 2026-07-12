import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ToastService } from '@by-iara/shared-ui';
import { Reservations } from './reservations';
import {
  ReservationListParams,
  ReservationPage,
  ReservationResponse,
} from './reservation.models';
import { ReservationsApi } from './reservations-api';

const emptyPage: ReservationPage = {
  items: [],
  page: 0,
  size: 10,
  total: 0,
};

function reservation(
  id: string,
  startsAt: string,
  status: ReservationResponse['status'] = 'CONFIRMED',
): ReservationResponse {
  const start = new Date(startsAt);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 60);

  return {
    id,
    status,
    serviceId: 'service-1',
    serviceVariantId: 'variant-1',
    serviceName: 'Relaxing massage',
    durationMinutes: 60,
    price: { amountCents: 7500, currency: 'EUR' },
    startsAt,
    endsAt: end.toISOString(),
    customer: {
      name: `Customer ${id}`,
      email: `${id}@example.com`,
      phone: '+351912345678',
    },
    notes: null,
  };
}

describe('Reservations', () => {
  let fixture: ComponentFixture<Reservations>;
  let api: {
    list: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T10:00:00.000Z'));

    api = {
      list: vi.fn((params: ReservationListParams = {}) => {
        if (
          params.statuses?.includes('CONFIRMED') &&
          (params.size === 100 || params.size === 250)
        ) {
          return of({
            items: [
              reservation('today-1', '2026-06-29T08:00:00.000Z'),
              reservation('tomorrow-1', '2026-06-30T12:00:00.000Z'),
            ],
            page: 0,
            size: 100,
            total: 2,
          } satisfies ReservationPage);
        }

        if (params.statuses?.includes('PENDING')) {
          return of({
            ...emptyPage,
            items: [
              reservation('pending-1', '2026-06-29T09:00:00.000Z', 'PENDING'),
            ],
            total: 1,
          });
        }

        return of(emptyPage);
      }),
      confirm: vi.fn(),
      reject: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Reservations],
      providers: [
        provideRouter([]),
        { provide: ReservationsApi, useValue: api },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reservations);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests confirmed reservations for the selected week', () => {
    expect(api.list).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ['CONFIRMED'],
        from: '2026-05-31T22:00:00.000Z',
        to: '2026-07-12T22:00:00.000Z',
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: 250,
      }),
    );
  });

  it('renders calendar counts and empty day states separately from pending requests', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Needs action');
    expect(compiled.textContent).toContain('Calendar agenda');
    expect(compiled.textContent).toContain('Selected date');
    expect(compiled.textContent).toContain('confirmed booking');
    expect(compiled.textContent).toContain('No bookings');
    expect(compiled.textContent).toContain('Customer today-1');
    expect(compiled.textContent).toContain('Customer tomorrow-1');
  });

  it('reloads the confirmed reservation range when moving to the next week', () => {
    const nextButton = fixture.debugElement.query(
      By.css('button[aria-label="Next week"]'),
    );

    nextButton.nativeElement.click();
    fixture.detectChanges();

    expect(api.list).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ['CONFIRMED'],
        from: '2026-06-28T22:00:00.000Z',
        to: '2026-08-09T22:00:00.000Z',
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: 250,
      }),
    );
  });
});

describe('Reservations - arriving via the new-reservation email link', () => {
  it('highlights the matching pending request card', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T10:00:00.000Z'));

    const api = {
      list: vi.fn((params: ReservationListParams = {}) =>
        params.statuses?.includes('PENDING')
          ? of({
              ...emptyPage,
              items: [
                reservation('pending-1', '2026-06-29T09:00:00.000Z', 'PENDING'),
              ],
              total: 1,
            })
          : of(emptyPage),
      ),
      confirm: vi.fn(),
      reject: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Reservations],
      providers: [
        { provide: ReservationsApi, useValue: api },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ id: 'pending-1' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Reservations);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('#reservation-pending-1');
    expect(card).toBeTruthy();
    expect(card.classList.contains('is-highlighted')).toBe(true);

    vi.useRealTimers();
  });
});
