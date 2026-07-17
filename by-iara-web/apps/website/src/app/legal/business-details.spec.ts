import {
  BOOKING_POLICY,
  BUSINESS_DETAILS,
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

  it('keeps unfinished launch details detectable', () => {
    expect(isBusinessDetailMissing('legalName')).toBe(true);
    expect(isBusinessDetailMissing('inPersonPaymentMethods')).toBe(false);
  });
});
