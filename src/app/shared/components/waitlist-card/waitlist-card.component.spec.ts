import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WaitlistCardComponent } from './waitlist-card.component';
import { WaitlistService, WaitlistResponse } from '@/core/services/waitlist.service';

class WaitlistServiceStub {
  join = vi.fn<(email: string, honeypot?: string) => Promise<WaitlistResponse>>(() =>
    Promise.resolve({ success: true }),
  );
}

describe('WaitlistCardComponent', () => {
  let fixture: ComponentFixture<WaitlistCardComponent>;
  let service: WaitlistServiceStub;

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

    await TestBed.configureTestingModule({
      imports: [WaitlistCardComponent],
      providers: [{ provide: WaitlistService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(WaitlistCardComponent);
    fixture.detectChanges();
  });

  it('rejects an invalid email without calling the service and marks the field invalid', async () => {
    typeEmail('not-an-email');
    await submit();

    expect(service.join).not.toHaveBeenCalled();
    expect(fixture.componentInstance.fieldError()).toBe(true);
    expect(fixture.nativeElement.querySelector('#waitlist-email').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain('valid email');
  });

  it('confirms success for a valid email', async () => {
    typeEmail('user@example.com');
    await submit();

    expect(service.join).toHaveBeenCalledWith('user@example.com', '');
    expect(fixture.componentInstance.status()).toBe('success');
    expect(fixture.nativeElement.textContent).toContain("You're on the list");
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('keeps the honeypot out of the accessibility tree and tab order', () => {
    const decoy = fixture.nativeElement.querySelector('input[name="website"]') as HTMLInputElement;

    expect(decoy).not.toBeNull();
    expect(decoy.getAttribute('tabindex')).toBe('-1');
    expect(decoy.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('forwards a filled honeypot so the server can drop the submission', async () => {
    const decoy = fixture.nativeElement.querySelector('input[name="website"]') as HTMLInputElement;
    decoy.value = 'http://spam.example';
    decoy.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    typeEmail('user@example.com');
    await submit();

    expect(service.join).toHaveBeenCalledWith('user@example.com', 'http://spam.example');
  });

  it('treats a 200 response with success:false as an error', async () => {
    service.join.mockResolvedValueOnce({ success: false, message: 'Already registered.' });
    typeEmail('user@example.com');
    await submit();

    expect(fixture.componentInstance.status()).toBe('error');
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain('Already registered.');
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('shows a generic error on network failure without flagging the field as invalid', async () => {
    service.join.mockRejectedValueOnce(new Error('network down'));
    typeEmail('user@example.com');
    await submit();

    expect(fixture.componentInstance.status()).toBe('error');
    expect(fixture.componentInstance.fieldError()).toBe(false);
    expect(fixture.nativeElement.querySelector('#waitlist-email').getAttribute('aria-invalid')).toBeNull();
    expect(fixture.nativeElement.querySelector('#waitlist-error').textContent).toContain("couldn't add you");
  });

  it('clears the error state once the user edits the email again', async () => {
    typeEmail('bad');
    await submit();
    expect(fixture.componentInstance.status()).toBe('error');

    typeEmail('good@example.com');
    expect(fixture.componentInstance.status()).toBe('idle');
    expect(fixture.componentInstance.errorMessage()).toBe('');
  });
});
