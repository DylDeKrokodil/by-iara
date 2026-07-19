import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error-message';

describe('apiErrorMessage', () => {
  it('returns the API message when one is provided', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'Every pack must use a service duration' },
    });

    expect(apiErrorMessage(error, 'Could not save.')).toBe(
      'Every pack must use a service duration',
    );
  });

  it('supports plain-text API responses', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: 'Pack configuration is invalid',
    });

    expect(apiErrorMessage(error, 'Could not save.')).toBe(
      'Pack configuration is invalid',
    );
  });

  it('uses the fallback for an empty or unexpected response', () => {
    const error = new HttpErrorResponse({ status: 500, error: {} });

    expect(apiErrorMessage(error, 'Could not save.')).toBe('Could not save.');
  });
});
