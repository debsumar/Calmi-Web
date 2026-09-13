import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLATFORM } from '@/core/constants/platform.constants';
import { ApiService } from './api.service';
import { WaitlistService } from './waitlist.service';

const SERVER_URL = 'https://calmi-backend.vercel.app/profile/waiting/add';

const CREATED_BODY = {
  success: true,
  message: 'Added to waiting list successfully.',
  data: {
    id: 'wait_1',
    email: 'user@example.com',
    createdAt: '2026-09-13T00:00:00.000Z',
    userId: null,
    platform: 1,
    isActive: true,
  },
};

describe('WaitlistService', () => {
  let api: { post: ReturnType<typeof vi.fn> };
  let http: HttpTestingController;
  let service: WaitlistService;

  beforeEach(() => {
    api = { post: vi.fn(() => of({ success: true })) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
      ],
    });
    service = TestBed.inject(WaitlistService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls the backend gate first, then Brevo only after a 201 create', async () => {
    const submission = service.submit('user@example.com');

    // Brevo must stay untouched until the gate answers.
    expect(api.post).not.toHaveBeenCalled();

    const request = http.expectOne(SERVER_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'user@example.com', platform: PLATFORM.WEB });
    request.flush(CREATED_BODY);

    await expect(submission).resolves.toEqual({
      brevo: { outcome: 'ok' },
      server: { outcome: 'created', message: 'Added to waiting list successfully.' },
    });
    expect(api.post).toHaveBeenCalledWith('/waitlist', { email: 'user@example.com', website: '' });
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('skips Brevo on a duplicate backend response', async () => {
    const submission = service.submit('user@example.com');
    http.expectOne(SERVER_URL).flush(
      { message: 'This email is already on the waiting list.', error: 'Conflict', statusCode: 409 },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(submission).resolves.toEqual({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'duplicate', message: 'This email is already on the waiting list.' },
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('skips Brevo on validation, rate-limit and transport failures', async () => {
    const invalid = service.submit('invalid@example.com');
    http.expectOne(SERVER_URL).flush({ message: 'Invalid email.' }, { status: 400, statusText: 'Bad Request' });
    await expect(invalid).resolves.toEqual({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'invalid', message: 'Invalid email.' },
    });

    const rateLimited = service.submit('limited@example.com');
    http
      .expectOne(SERVER_URL)
      .flush({ message: 'Too many requests.' }, { status: 429, statusText: 'Too Many Requests' });
    await expect(rateLimited).resolves.toMatchObject({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'rate_limited' },
    });

    const offline = service.submit('offline@example.com');
    http.expectOne(SERVER_URL).error(new ProgressEvent('error'));
    await expect(offline).resolves.toMatchObject({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'failed' },
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('reports a Brevo failure without losing the successful backend create', async () => {
    api.post = vi.fn(() => of({ success: false, message: 'Waitlist is unavailable. Try again later.' }));
    const submission = service.submit('user@example.com');
    http.expectOne(SERVER_URL).flush(CREATED_BODY);

    await expect(submission).resolves.toEqual({
      brevo: { outcome: 'failed', message: 'Waitlist is unavailable. Try again later.' },
      server: { outcome: 'created', message: 'Added to waiting list successfully.' },
    });
  });

  it('calls neither upstream when the honeypot is filled', async () => {
    await expect(service.submit('user@example.com', 'https://spam.example')).resolves.toEqual({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'skipped' },
    });
    http.expectNone(SERVER_URL);
    expect(api.post).not.toHaveBeenCalled();
  });
});
