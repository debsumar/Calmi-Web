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

  it('renders numbered upcoming, active, and completed step cues', () => {
    const root = fixture.nativeElement as HTMLElement;
    const steps = root.querySelectorAll('ol > li');

    expect(root.querySelector('ol')?.getAttribute('aria-label')).toBe('Verification progress');
    expect(Array.from(root.querySelectorAll('.verification-step__label')).map((step) => step.textContent?.trim())).toEqual(['Details', 'Check', 'Result']);
    expect(steps[0].getAttribute('data-state')).toBe('complete');
    expect(steps[0].querySelector('.verification-step__marker')?.textContent?.trim()).toBe('✓');
    expect(steps[1].getAttribute('data-state')).toBe('active');
    expect(steps[1].getAttribute('aria-current')).toBe('step');
    expect(steps[2].getAttribute('data-state')).toBe('upcoming');
    expect(steps[2].querySelector('.verification-step__marker')?.textContent?.trim()).toBe('3');
  });

  it('renders failure with an explicit text and icon cue', () => {
    fixture.componentRef.setInput('currentStep', 'result');
    fixture.componentRef.setInput('status', 'failed');
    fixture.detectChanges();

    const resultStep = fixture.nativeElement.querySelectorAll('ol > li')[2] as HTMLElement;
    expect(resultStep.getAttribute('data-state')).toBe('error');
    expect(resultStep.getAttribute('aria-label')).toBe('Result: Needs attention');
    expect(resultStep.querySelector('.verification-step__marker')?.textContent?.trim()).toBe('!');
    expect(resultStep.querySelector('.verification-step__status')?.textContent?.trim()).toBe('Needs attention');
  });
});
