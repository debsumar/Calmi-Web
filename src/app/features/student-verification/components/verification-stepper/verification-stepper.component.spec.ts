// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VerificationStepperComponent } from './verification-stepper.component';

describe('VerificationStepperComponent', () => {
  let fixture: ComponentFixture<VerificationStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationStepperComponent);
    fixture.componentRef.setInput('currentStep', 'check');
    fixture.detectChanges();
  });

  it('renders ordered Details, Check, Result steps with current and completed state', () => {
    const root = fixture.nativeElement as HTMLElement;
    const steps = root.querySelectorAll('ol > li');

    expect(root.querySelector('ol')?.getAttribute('aria-label')).toBe('Verification progress');
    expect(Array.from(steps).map((step) => step.textContent?.trim())).toEqual(['Details', 'Check', 'Result']);
    expect(steps[0].getAttribute('data-done')).toBe('true');
    expect(steps[1].getAttribute('aria-current')).toBe('step');
    expect(steps[2].getAttribute('aria-current')).toBeNull();
  });

  it('moves current step and connector completion when input changes', () => {
    fixture.componentRef.setInput('currentStep', 'result');
    fixture.detectChanges();

    const steps = fixture.nativeElement.querySelectorAll('ol > li');
    expect(steps[1].getAttribute('data-done')).toBe('true');
    expect(steps[2].getAttribute('aria-current')).toBe('step');
  });
});
