import { HttpErrorResponse } from '@angular/common/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs only name, status and a fixed message for HttpErrorResponse', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    new GlobalErrorHandler().handleError(new HttpErrorResponse({
      status: 401,
      url: 'https://api.example.com/user?email=a@b.com',
      error: { email: 'person@example.com' },
      headers: undefined,
    }));

    const logged = JSON.stringify(spy.mock.calls);
    expect(spy.mock.calls[0][1]).toEqual({ name: 'HttpErrorResponse', status: 401, message: 'HTTP request failed' });
    expect(logged).not.toContain('person@example.com');
    expect(logged).not.toContain('api.example.com');
  });

  it('redacts emails and urls from plain Error messages and ignores non-Error payloads', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new GlobalErrorHandler();
    handler.handleError(new Error('failed for person@example.com at https://x.test/a?t=secret'));
    handler.handleError({ token: 'secret' });

    expect(spy.mock.calls[0][1]).toEqual({ name: 'Error', message: 'failed for [redacted-email] at [redacted-url]' });
    expect(spy.mock.calls[1][1]).toEqual({ name: 'UnknownError', message: 'Non-Error value thrown' });
  });
});
