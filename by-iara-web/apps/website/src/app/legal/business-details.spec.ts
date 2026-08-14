import {
  BOOKING_POLICY,
  BUSINESS_DETAILS,
  getBookingRetentionLabel,
  getLegalFormLabel,
  isBusinessDetailMissing,
} from './business-details';

describe('business details', () => {
  it('tracks the confirmed in-person payment methods', () => {
    expect(BUSINESS_DETAILS.inPersonPaymentMethods).toEqual([
      'cash',
      'mbWay',
      'bankTransfer',
    ]);
  });

  it('tracks the published cancellation policy as structured values', () => {
    expect(BOOKING_POLICY).toEqual({
      cancellationNoticeHours: 24,
      firstLateCancellationHasPenalty: false,
      repeatedLateCancellationDepositCents: 1500,
      packageValidityMonths: 6,
    });
  });

  it('publishes the confirmed provider identity and contact details', () => {
    expect(BUSINESS_DETAILS).toMatchObject({
      legalName: 'Iara Gouveia',
      legalForm: 'selfEmployed',
      taxId: '255649642',
      registeredAddress: ['Rua Vila do Seixal 5'],
      email: 'info@iaragouveia.com',
      privacyEmail: 'info@iaragouveia.com',
      adrEntityName:
        'Centro de Arbitragem de Conflitos de Consumo de Lisboa',
      adrEntityUrl: 'https://www.centroarbitragemlisboa.pt/',
    });
    expect(isBusinessDetailMissing('legalName')).toBe(false);
    expect(isBusinessDetailMissing('inPersonPaymentMethods')).toBe(false);
  });

  it('localizes the independent professional legal form', () => {
    expect(getLegalFormLabel('pt-PT', BUSINESS_DETAILS.legalForm)).toBe(
      'Trabalhadora independente',
    );
    expect(getLegalFormLabel('en-US', BUSINESS_DETAILS.legalForm)).toBe(
      'Self-employed professional',
    );
  });

  it('localizes the two-year operational retention period', () => {
    expect(
      getBookingRetentionLabel('pt-PT', BUSINESS_DETAILS.bookingRetention),
    ).toBe('2 anos');
    expect(
      getBookingRetentionLabel('en-US', BUSINESS_DETAILS.bookingRetention),
    ).toBe('2 years');
    expect(isBusinessDetailMissing('bookingRetention')).toBe(false);
  });
});
