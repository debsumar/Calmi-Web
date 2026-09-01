// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { StudentVerificationResult } from '../../models/student-verification.model';
import { VerificationResultStepComponent } from './verification-result-step.component';

describe('VerificationResultStepComponent', () => {
  let fixture: ComponentFixture<VerificationResultStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VerificationResultStepComponent] }).compileComponents();
    fixture = TestBed.createComponent(VerificationResultStepComponent);
  });

  function render(status: string, result: StudentVerificationResult | null): void {
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
  }

  it('renders approved receipt with icon, text, discounted price, and valid-until date', () => {
    render('approved', { requestId: 'fixture-1', status: 'approved', verifiedUntil: '2027-09-01T00:00:00.000Z' });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain("You're verified");
    expect(root.textContent).toContain('₹99 / month');
    expect(root.querySelector('.strike')).not.toBeNull();
    expect(root.querySelector('.result-icon svg')).not.toBeNull();
  });

  it('renders failed actions and emits changeMethod/escalate', () => {
    render('failed', { requestId: 'fixture-1', status: 'rejected', reasonCode: 'not_enrolled' });
    const component = fixture.componentInstance;
    let changeMethods = 0;
    let retries = 0;
    let escalations = 0;
    component.changeMethod.subscribe(() => changeMethods++);
    component.retry.subscribe(() => retries++);
    component.escalate.subscribe(() => escalations++);
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();
    buttons[1].click();
    expect(fixture.nativeElement.textContent).toContain("couldn't verify");
    expect(changeMethods).toBe(1);
    expect(retries).toBe(0);
    expect(escalations).toBe(1);

    render('error', null);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(retries).toBe(1);
  });

  it('renders manual ticket reference and dates, and uses continued output for checkout', () => {
    render('manualPending', { requestId: 'fixture-1', status: 'pending', pendingKind: 'manual', supportTicketRef: 'SV-48213', submittedAt: '2026-09-01T03:45:00.000Z', expectedBy: '2026-09-03T00:00:00.000Z' });
    expect(fixture.nativeElement.textContent).toContain('SV-48213');
    expect(fixture.nativeElement.textContent).toContain('Expected by');

    render('alreadyVerified', { requestId: 'fixture-1', status: 'approved', reasonCode: 'already_verified', verifiedUntil: '2027-01-01T00:00:00.000Z' });
    const component = fixture.componentInstance;
    let continued = 0;
    component.continued.subscribe(() => continued++);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(continued).toBe(1);
  });

  it('renders expired-code and service-error recovery panels', () => {
    render('otpExpired', { requestId: 'fixture-1', status: 'rejected', reasonCode: 'otp_expired' });
    expect(fixture.nativeElement.textContent).toContain('code has expired');
    render('error', null);
    expect(fixture.nativeElement.textContent).toContain('service unavailable');
    expect(fixture.nativeElement.querySelector('.result-icon svg')).not.toBeNull();
  });
});
