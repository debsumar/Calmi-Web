import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface WaitlistResponse {
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class WaitlistService {
  private api = inject(ApiService);

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
}
