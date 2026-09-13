import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PLATFORM } from '@/core/constants/platform.constants';
import { ApiService } from './api.service';

export interface WaitlistResponse {
  success: boolean;
  message?: string;
}

export interface ServerWaitlistSuccessResponse {
  success: true;
  message: string;
  data: {
    id: string;
    email: string;
    createdAt: string;
    userId: string | null;
    platform: number | null;
    isActive: boolean;
  };
}

export interface ServerWaitlistConflictResponse {
  message: string;
  error: 'Conflict';
  statusCode: 409;
}

export type BrevoWaitlistResult =
  | { outcome: 'ok'; message?: string }
  | { outcome: 'failed'; message?: string }
  /** The backend did not confirm a new sign-up, so the Brevo call was never made. */
  | { outcome: 'skipped' };

export type ServerWaitlistResult =
  | { outcome: 'created'; message: string }
  | { outcome: 'duplicate'; message?: string }
  | { outcome: 'rate_limited'; message?: string }
  | { outcome: 'invalid'; message?: string }
  | { outcome: 'failed'; message?: string }
  | { outcome: 'skipped' };

export interface WaitlistSubmissionResult {
  brevo: BrevoWaitlistResult;
  server: ServerWaitlistResult;
}

@Injectable({ providedIn: 'root' })
export class WaitlistService {
  private api = inject(ApiService);
  private http = inject(HttpClient);

  /**
   * Registers an email on the public waitlist.
   * The server is the authority on validation, de-duplication and rate limiting;
   * the client-side check is only a UX affordance.
   *
   * @param honeypot Value of the hidden decoy field. Real users leave it empty;
   *                 a non-empty value tells the server to drop the submission.
   */
  join(email: string, honeypot = ''): Promise<WaitlistResponse> {
    return firstValueFrom(
      this.api.post<WaitlistResponse>('/waitlist', { email, website: honeypot }),
    );
  }

  addToServerWaitlist(email: string): Promise<ServerWaitlistSuccessResponse> {
    return firstValueFrom(
      this.http.post<ServerWaitlistSuccessResponse>(`${environment.serverUrl}/profile/waiting/add`, {
        email,
        platform: PLATFORM.WEB,
      }),
    );
  }

  /**
   * Gated sequence, not a parallel fan-out: the backend at `serverUrl` is the
   * gate. Only a fresh `created` (201) there earns the second call to the
   * Brevo function. Duplicate, validation, rate-limit and transport failures
   * all leave Brevo untouched, so a rejected sign-up never sends a mail.
   */
  async submit(email: string, honeypot = ''): Promise<WaitlistSubmissionResult> {
    // Honeypot: a filled decoy means a bot. Contact neither upstream.
    if (honeypot) {
      return { brevo: { outcome: 'skipped' }, server: { outcome: 'skipped' } };
    }

    const server = await this.addToServerWaitlist(email).then(
      (response): ServerWaitlistResult => ({ outcome: 'created', message: response.message }),
      (error: unknown): ServerWaitlistResult => this.toServerError(error),
    );

    if (server.outcome !== 'created') {
      return { brevo: { outcome: 'skipped' }, server };
    }

    const brevo = await this.join(email, honeypot).then(
      (response): BrevoWaitlistResult =>
        response.success === false
          ? { outcome: 'failed', message: response.message }
          : { outcome: 'ok', message: response.message },
      (): BrevoWaitlistResult => ({ outcome: 'failed' }),
    );

    return { brevo, server };
  }

  private toServerError(error: unknown): ServerWaitlistResult {
    if (!(error instanceof HttpErrorResponse)) return { outcome: 'failed' };

    const message = this.errorMessage(error);
    switch (error.status) {
      case 409:
        return { outcome: 'duplicate', message };
      case 400:
        return { outcome: 'invalid', message };
      case 429:
        return { outcome: 'rate_limited', message };
      default:
        return { outcome: 'failed', message };
    }
  }

  private errorMessage(error: HttpErrorResponse): string | undefined {
    const body: unknown = error.error;
    if (error.status === 409 && this.isConflictResponse(body)) return body.message;

    return typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message
      : undefined;
  }

  private isConflictResponse(value: unknown): value is ServerWaitlistConflictResponse {
    return typeof value === 'object'
      && value !== null
      && 'message' in value
      && typeof value.message === 'string'
      && 'error' in value
      && value.error === 'Conflict'
      && 'statusCode' in value
      && value.statusCode === 409;
  }
}
