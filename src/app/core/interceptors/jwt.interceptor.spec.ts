import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  const token = signal<string | null>('test-token');
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    token.set('test-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { accessToken: token } },
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  function authorizationFor(url: string): string | null {
    http.get(url).subscribe();
    const req = controller.expectOne(url);
    const header = req.request.headers.get('Authorization');
    req.flush({});
    return header;
  }

  it.each(['/api', '/api/waitlist', '/api/a/b?x=1', `${window.location.origin}/api/me`])(
    'adds the Bearer token for same-origin api request %s',
    (url) => expect(authorizationFor(url)).toBe('Bearer test-token'),
  );

  it.each([
    '/apiary',
    '/apiary/x',
    '/other',
    '//evil.com/api',
    '//evil.com/api/x',
    'https://evil.com/api/x',
    'http://localhost.evil.com/api/x',
  ])('does not leak the token to %s', (url) => expect(authorizationFor(url)).toBeNull());

  it('adds no header when there is no token', () => {
    token.set(null);
    expect(authorizationFor('/api/waitlist')).toBeNull();
  });
});
