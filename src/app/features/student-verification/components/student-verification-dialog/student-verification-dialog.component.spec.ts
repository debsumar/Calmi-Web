// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentVerificationDialogComponent } from './student-verification-dialog.component';

describe('StudentVerificationDialogComponent', () => {
  let fixture: ComponentFixture<StudentVerificationDialogComponent>;

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    await TestBed.configureTestingModule({
      imports: [StudentVerificationDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentVerificationDialogComponent);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
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

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(document.activeElement).toBe(opener);
    expect(closed).toBe(1);
    opener.remove();
  });

  it('returns failed verification to collecting pane with method selector', async () => {
    const service = fixture.componentInstance.service;
    service.simulatedOutcome.set('failed');
    service.submit({
      institutionId: 'iit-kharagpur',
      institutionName: 'IIT Kharagpur',
      method: 'document',
      documentName: 'enrolment-letter.pdf',
      consentAccepted: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 320));

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
    await new Promise((resolve) => setTimeout(resolve, 320));
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
    service.reset();
  });
});
