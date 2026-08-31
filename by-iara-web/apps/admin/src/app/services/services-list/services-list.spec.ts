import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import type { Service } from '../service.models';
import { ServicesApi } from '../services-api';
import { ServicesList } from './services-list';

function service(id: string, active: boolean): Service {
  return {
    id,
    slug: `${id}-slug`,
    name: active ? 'Active massage' : 'Inactive massage',
    description: null,
    active,
    sortOrder: 0,
    featured: false,
    image: null,
    translations: {},
    variants: [],
    packOffers: [],
  };
}

describe('ServicesList', () => {
  let fixture: ComponentFixture<ServicesList>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesList],
      providers: [
        provideRouter([]),
        {
          provide: ServicesApi,
          useValue: {
            list: () =>
              of([
                service('active-service', true),
                service('inactive-service', false),
              ]),
            remove: vi.fn(() => of(undefined)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesList);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('uses compact action menus with contextual service actions', () => {
    const element = fixture.nativeElement as HTMLElement;
    const menus = element.querySelectorAll('byiara-action-menu');

    expect(menus).toHaveLength(2);
    expect(
      menus[0]
        .querySelector('.action-menu-trigger')
        ?.getAttribute('aria-label'),
    ).toBe('Actions for Active massage');
    expect(menus[0].querySelector('[aria-label="Edit service"]')).toBeTruthy();
    expect(
      menus[0].querySelector('[aria-label="Deactivate service"]'),
    ).toBeTruthy();
    expect(menus[1].querySelector('[aria-label="Edit service"]')).toBeTruthy();
    expect(
      menus[1].querySelector('[aria-label="Deactivate service"]'),
    ).toBeNull();
  });

  it('routes the edit action through the service menu', () => {
    const navigate = vi.spyOn(router, 'navigate');
    const edit = fixture.nativeElement.querySelector(
      'byiara-action-menu [aria-label="Edit service"]',
    ) as HTMLButtonElement;

    edit.click();

    expect(navigate).toHaveBeenCalledWith(['/services', 'active-service']);
  });
});
