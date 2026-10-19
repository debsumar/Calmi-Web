import { DestroyRef, Injectable, signal, computed, inject } from '@angular/core';

export interface OnboardingSelections {
  goal: string | null;
  soundPreference: string | null;
  duration: string | null;
}

export interface OnboardingStartOptions {
  studentVerification?: boolean;
}

const COMPLETED_KEY = 'calmi-onboarding-completed';
const SELECTIONS_KEY = 'calmi-onboarding-selections';
const AUTO_CLOSE_MS = 1500;

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  // Private writable signals
  private readonly _isActive = signal(false);
  private readonly _currentStep = signal(1);
  private readonly _totalSteps = 4;
  private readonly _selections = signal<OnboardingSelections>({
    goal: null,
    soundPreference: null,
    duration: null,
  });
  private readonly _studentVerificationRequested = signal(false);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  // Public readonly signals
  readonly isActive = this._isActive.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly selections = this._selections.asReadonly();
  readonly studentVerificationRequested = this._studentVerificationRequested.asReadonly();

  // Computed progress percentage
  readonly progress = computed(() => {
    return ((this._currentStep() - 1) / (this._totalSteps - 1)) * 100;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearCloseTimer());
  }

  start(options: OnboardingStartOptions = {}): void {
    this.clearCloseTimer();
    this._studentVerificationRequested.set(options.studentVerification === true);
    this._currentStep.set(1);
    this._selections.set({ goal: null, soundPreference: null, duration: null });
    this._isActive.set(true);
  }

  close(): void {
    this.clearCloseTimer();
    this._isActive.set(false);
  }

  /** Advances at most to the final step (`totalSteps`); never past it. */
  nextStep(): void {
    this._currentStep.update(s => Math.min(s + 1, this._totalSteps));
  }

  prevStep(): void {
    if (this._currentStep() > 1) {
      this._currentStep.update(s => s - 1);
    }
  }

  setSelection(key: keyof OnboardingSelections, value: string): void {
    this._selections.update(current => ({ ...current, [key]: value }));
  }

  finish(): void {
    this.clearCloseTimer();
    this._currentStep.set(this._totalSteps);
    this.persist();
    // Automatically close after a short delay; cleared by start()/close()/destroy.
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      this.close();
    }, AUTO_CLOSE_MS);
  }

  private persist(): void {
    try {
      localStorage.setItem(COMPLETED_KEY, 'true');
      localStorage.setItem(SELECTIONS_KEY, JSON.stringify(this._selections()));
    } catch {
      // Storage blocked or full: onboarding still completes for this session.
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
