// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VerificationCheckingStepComponent } from './verification-checking-step.component';

describe('VerificationCheckingStepComponent', () => {
  let fixture: ComponentFixture<VerificationCheckingStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VerificationCheckingStepComponent] }).compileComponents();
    fixture = TestBed.createComponent(VerificationCheckingStepComponent);
    fixture.componentRef.setInput('label', 'Jadavpur University');
    fixture.detectChanges();
  });

  it('renders an indeterminate decorative progress bar and visible status copy', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.progress')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.progress-bar')).not.toBeNull();
    expect(root.querySelector('.sr-status')?.textContent).toContain('Jadavpur University');
    expect(root.querySelector('.sr-status')?.getAttribute('role')).toBeNull();
    expect(root.querySelector('.sr-status')?.getAttribute('aria-live')).toBeNull();
    expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
