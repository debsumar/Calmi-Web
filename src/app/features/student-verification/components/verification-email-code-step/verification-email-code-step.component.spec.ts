// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VerificationEmailCodeStepComponent } from './verification-email-code-step.component';

describe('VerificationEmailCodeStepComponent', () => {
  let fixture: ComponentFixture<VerificationEmailCodeStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VerificationEmailCodeStepComponent] }).compileComponents();
    fixture = TestBed.createComponent(VerificationEmailCodeStepComponent);
    fixture.componentRef.setInput('email', 'student@jadavpuruniversity.in');
    fixture.componentRef.setInput('resendIn', 45);
    fixture.detectChanges();
  });

  it('renders six labelled numeric inputs and disables confirmation until complete', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('input[inputmode="numeric"]')).toHaveLength(6);
    expect(root.querySelector('input')?.getAttribute('aria-label')).toBe('Digit 1 of 6');
    expect(root.querySelector('button.button-primary')?.hasAttribute('disabled')).toBe(true);
    expect(root.textContent).toContain('Resend available in 45 seconds.');
  });

  it('auto-advances, filters non-digits, and emits exactly six digits', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('.otp-input'));
    inputs[0].value = 'a1';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.valueAt(0)).toBe('1');
    expect(document.activeElement).toBe(inputs[1]);

    const emitted: string[] = [];
    component.codeSubmitted.subscribe((code) => emitted.push(code));
    inputs.forEach((input, index) => {
      input.value = String(index + 1);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.button-primary')?.hasAttribute('disabled')).toBe(false);
    (fixture.nativeElement.querySelector('button.button-primary') as HTMLButtonElement).click();
    expect(emitted).toEqual(['123456']);
  });

  it('fills six digits from paste and emits resend/change actions', () => {
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('canResend', true);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.otp-input') as HTMLInputElement;
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '12x3456' } });
    input.dispatchEvent(paste);
    fixture.detectChanges();
    expect(component.code()).toBe('123456');

    let resendCount = 0;
    let changeCount = 0;
    component.resend.subscribe(() => resendCount++);
    component.changeEmail.subscribe(() => changeCount++);
    fixture.nativeElement.querySelector('button:nth-of-type(2)').click();
    fixture.nativeElement.querySelector('button:nth-of-type(3)').click();
    expect(resendCount).toBe(1);
    expect(changeCount).toBe(1);
  });
});
