// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_CHECK_DELAY_MS } from '../../services/student-verification.fixtures';
import { StudentVerificationDialogComponent } from './student-verification-dialog.component';

/** Worst-case fixture check: base delay plus the `% 60` jitter (max 59ms). */
const FIXTURE_CHECK_WORST_CASE_MS = FIXTURE_CHECK_DELAY_MS + 60;

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

describe('StudentVerificationDialogComponent', () => {
  let fixture: ComponentFixture<StudentVerificationDialogComponent>;

  beforeEach(async () => {
    // matches:true => prefers-reduced-motion, so close completes synchronously.
    stubMatchMedia(true);
    await TestBed.configureTestingModule({
      imports: [StudentVerificationDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentVerificationDialogComponent);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Reset in afterEach so a failing assertion cannot leak state or fake timers.
    fixture.componentInstance.service.reset();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders an accessible dialog shell and keeps non-active panes inert', async () => {
    const opener = document.createElement('button');
    opener.id = 'verification-opener';
    document.body.appendChild(opener);
    opener.focus();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const dialog = root.querySelector('[role="dialog"]');
    const heading = root.querySelector('#student-verification-title') as HTMLElement;
    const panes = root.querySelectorAll<HTMLElement>('[data-pane]');

    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('student-verification-title');
    expect(root.querySelector('[aria-live="polite"]')?.getAttribute('role')).toBe('status');
    expect(heading.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(heading);
    expect(Array.from(panes).filter((pane) => pane.hidden)).toHaveLength(3);
    expect(Array.from(panes).filter((pane) => pane.hasAttribute('inert'))).toHaveLength(3);

    opener.remove();
  });

  it('handles Escape and restores focus before closing', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(document.activeElement).toBe(opener);
    expect(closed).toBe(1);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.isVisible()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    opener.remove();
  });

  it('animates close on Escape when motion is allowed and finishes after the close timer', async () => {
    vi.useFakeTimers();
    stubMatchMedia(false);
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.isVisible()).toBe(true);

    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    fixture.detectChanges();

    // Closing, not closed: scrim is still mounted and inert until the timer fires.
    expect(closed).toBe(1);
    expect(fixture.componentInstance.isClosing()).toBe(true);
    expect(fixture.componentInstance.isVisible()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(opener);

    await vi.advanceTimersByTimeAsync(2_000);
    fixture.detectChanges();

    expect(fixture.componentInstance.isClosing()).toBe(false);
    expect(fixture.componentInstance.isVisible()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    opener.remove();
  });

  it('returns failed verification to collecting pane with method selector', async () => {
    vi.useFakeTimers();
    const service = fixture.componentInstance.service;
    service.simulatedOutcome.set('failed');
    service.submit({
      institutionId: 'iit-kharagpur',
      institutionName: 'IIT Kharagpur',
      method: 'document',
      documentName: 'enrolment-letter.pdf',
      consentAccepted: true,
    });
    await vi.advanceTimersByTimeAsync(FIXTURE_CHECK_WORST_CASE_MS);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const resultPane = fixture.nativeElement.querySelector('[data-pane="result"]') as HTMLElement;
    const changeMethod = Array.from(resultPane.querySelectorAll('button')).find((button) => button.textContent?.includes('Try another method')) as HTMLButtonElement;
    changeMethod.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const collectingPane = fixture.nativeElement.querySelector('[data-pane="collecting"]') as HTMLElement;
    expect(service.status()).toBe('collecting');
    expect(collectingPane.hidden).toBe(false);
    expect(collectingPane.querySelector('fieldset legend')?.textContent).toContain('prove enrolment');
    expect((collectingPane.querySelector('#verification-institution') as HTMLInputElement).value).toBe('IIT Kharagpur');
    expect((collectingPane.querySelector('input[value="document"]') as HTMLInputElement).checked).toBe(true);
  });

  it('returns expired email verification to collecting pane on Change email', async () => {
    const service = fixture.componentInstance.service;
    service.simulatedOutcome.set('otpExpired');
    service.submit({
      institutionId: 'jadavpur-university',
      institutionName: 'Jadavpur University',
      method: 'email',
      institutionalEmail: 'student@jadavpuruniversity.in',
      consentAccepted: true,
    });
    service.confirmCode('123456');

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const resultPane = fixture.nativeElement.querySelector('[data-pane="result"]') as HTMLElement;
    const changeEmail = Array.from(resultPane.querySelectorAll('button')).find((button) => button.textContent?.includes('Change email')) as HTMLButtonElement;
    changeEmail.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const collectingPane = fixture.nativeElement.querySelector('[data-pane="collecting"]') as HTMLElement;
    expect(service.status()).toBe('collecting');
    expect(collectingPane.hidden).toBe(false);
    expect(collectingPane.querySelector('fieldset legend')?.textContent).toContain('prove enrolment');
    expect((collectingPane.querySelector('#verification-institution') as HTMLInputElement).value).toBe('Jadavpur University');
  });


  it('retains approved fixture state after close for pricing unlock', async () => {
    vi.useFakeTimers();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    fixture.componentInstance.service.submit({
      institutionId: 'jadavpur-university',
      institutionName: 'Jadavpur University',
      method: 'document',
      documentName: 'enrolment-letter.pdf',
      consentAccepted: true,
    });
    await vi.advanceTimersByTimeAsync(FIXTURE_CHECK_WORST_CASE_MS);
    expect(fixture.componentInstance.service.status()).toBe('approved');
    expect(fixture.componentInstance.service.canUseStudentPlan()).toBe(true);

    let verifiedCount = 0;
    fixture.componentInstance.verified.subscribe(() => verifiedCount++);
    fixture.componentRef.setInput('open', true);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(verifiedCount).toBe(1);

    fixture.componentInstance.service.goBack();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.service.goForward();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.service.status()).toBe('approved');
    expect(fixture.componentInstance.service.canUseStudentPlan()).toBe(true);
    expect(verifiedCount).toBe(1);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.service.canUseStudentPlan()).toBe(true);
    expect(fixture.componentInstance.service.status()).toBe('approved');
    opener.remove();
  });

  it('navigates history with guarded Alt+Arrow shortcuts', async () => {
    const service = fixture.componentInstance.service;
    service.goToCollecting();
    service.submit({
      institutionId: 'jadavpur-university',
      institutionName: 'Jadavpur University',
      method: 'email',
      institutionalEmail: 'student@jadavpuruniversity.in',
      consentAccepted: true,
    });

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const back = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, cancelable: true });
    document.dispatchEvent(back);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(back.defaultPrevented).toBe(true);
    expect(service.status()).toBe('collecting');
    expect(fixture.componentInstance.direction()).toBe('backward');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#student-verification-title'));

    const forward = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, cancelable: true });
    document.dispatchEvent(forward);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(forward.defaultPrevented).toBe(true);
    expect(service.status()).toBe('emailSent');
    expect(fixture.componentInstance.direction()).toBe('forward');
  });
});
