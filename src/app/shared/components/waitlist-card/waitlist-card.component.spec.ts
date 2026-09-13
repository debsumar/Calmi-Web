import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LucideCircleAlert, LucideLoaderCircle, LucideMailCheck, provideLucideIcons } from '@lucide/angular';
import { WaitlistCardComponent } from './waitlist-card.component';
import { WaitlistService, WaitlistSubmissionResult } from '@/core/services/waitlist.service';

class WaitlistServiceStub {
  submit = vi.fn<(email: string, honeypot?: string) => Promise<WaitlistSubmissionResult>>(() =>
    Promise.resolve({
      brevo: { outcome: 'ok' },
      server: { outcome: 'created', message: 'Added to waiting list successfully.' },
    }),
  );
}

describe('WaitlistCardComponent', () => {
  let fixture: ComponentFixture<WaitlistCardComponent>;
  let service: WaitlistServiceStub;
  let messageService: { add: ReturnType<typeof vi.fn> };

  const typeEmail = (value: string) => {
    const input = fixture.nativeElement.querySelector('#waitlist-email') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return input;
  };

  const submit = async () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    service = new WaitlistServiceStub();
    messageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [WaitlistCardComponent],
      providers: [
        { provide: WaitlistService, useValue: service },
        { provide: MessageService, useValue: messageService },
        provideLucideIcons(LucideMailCheck, LucideLoaderCircle, LucideCircleAlert),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WaitlistCardComponent);
    fixture.detectChanges();
  });

  it('shows a live regex error while typing and clears it once the address is valid', async () => {
    expect(fixture.nativeElement.querySelector('#waitlist-error')).toBeNull();

    const input = typeEmail('a');
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain('valid email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('waitlist-error');

    typeEmail('a@gmail.c');
    expect(fixture.nativeElement.querySelector('#waitlist-error')).not.toBeNull();

    typeEmail('a@gmail.com');
    expect(fixture.nativeElement.querySelector('#waitlist-error')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();

    // Emptying the field goes quiet again rather than accusing an untouched form.
    typeEmail('');
    expect(fixture.nativeElement.querySelector('#waitlist-error')).toBeNull();
    expect(service.submit).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without calling the service and marks the field invalid', async () => {
    typeEmail('not-an-email');
    await submit();

    expect(service.submit).not.toHaveBeenCalled();
    expect(fixture.componentInstance.fieldError()).toBe(true);
    expect(fixture.nativeElement.querySelector('#waitlist-email').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain('valid email');
  });

  it('confirms a newly created server waitlist entry', async () => {
    typeEmail('user@example.com');
    await submit();

    expect(service.submit).toHaveBeenCalledWith('user@example.com', '');
    expect(fixture.componentInstance.status()).toBe('success');
    expect(fixture.nativeElement.textContent).toContain("You're on the list");
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('keeps the honeypot out of the accessibility tree and tab order', () => {
    const decoy = fixture.nativeElement.querySelector('input[name="website"]') as HTMLInputElement;

    expect(decoy).not.toBeNull();
    expect(decoy.getAttribute('tabindex')).toBe('-1');
    expect(decoy.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('forwards a filled honeypot to the combined submission', async () => {
    service.submit.mockResolvedValueOnce({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'skipped' },
    });
    const decoy = fixture.nativeElement.querySelector('input[name="website"]') as HTMLInputElement;
    decoy.value = 'http://spam.example';
    decoy.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    typeEmail('user@example.com');
    await submit();

    expect(service.submit).toHaveBeenCalledWith('user@example.com', 'http://spam.example');
    // A bot sees the same confirmation a human sees, with no upstream call made.
    expect(fixture.componentInstance.status()).toBe('success');
  });

  it('warns for an existing backend entry without showing success or field error', async () => {
    service.submit.mockResolvedValueOnce({
      brevo: { outcome: 'ok' },
      server: { outcome: 'duplicate', message: 'This email is already on the waiting list.' },
    });
    typeEmail('user@example.com');
    await submit();

    expect(fixture.componentInstance.status()).toBe('idle');
    expect(fixture.componentInstance.fieldError()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain("You're on the list");
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
  });

  it('shows an inline error and error toast when the backend gate fails', async () => {
    service.submit.mockResolvedValueOnce({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'failed', message: 'Backend unavailable.' },
    });
    typeEmail('user@example.com');
    await submit();

    expect(fixture.componentInstance.status()).toBe('error');
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain('Backend unavailable.');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('still confirms the sign-up when the backend created it but Brevo failed', async () => {
    service.submit.mockResolvedValueOnce({
      brevo: { outcome: 'failed' },
      server: { outcome: 'created', message: 'Added to waiting list successfully.' },
    });
    typeEmail('user@example.com');
    await submit();

    expect(fixture.componentInstance.status()).toBe('success');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('shows an inline error and error toast when the backend rejects the email', async () => {
    service.submit.mockResolvedValueOnce({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'invalid', message: 'Enter a valid email.' },
    });
    typeEmail('user@example.com');
    await submit();

    expect(fixture.componentInstance.status()).toBe('error');
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain('Enter a valid email.');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('clears the error state once the user edits the email again', async () => {
    service.submit.mockResolvedValueOnce({
      brevo: { outcome: 'skipped' },
      server: { outcome: 'failed' },
    });
    typeEmail('user@example.com');
    await submit();
    expect(fixture.componentInstance.status()).toBe('error');

    typeEmail('good@example.com');
    expect(fixture.componentInstance.status()).toBe('idle');
    expect(fixture.componentInstance.errorMessage()).toBe('');
  });
});
