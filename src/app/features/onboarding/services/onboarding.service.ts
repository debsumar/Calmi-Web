import { Injectable, signal, computed, effect } from '@angular/core';

export interface OnboardingSelections {
  goal: string | null;
  soundPreference: string | null;
  duration: string | null;
}

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

  // Public readonly signals
  readonly isActive = this._isActive.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly selections = this._selections.asReadonly();
  
  // Computed progress percentage
  readonly progress = computed(() => {
    return ((this._currentStep() - 1) / (this._totalSteps - 1)) * 100;
  });

  constructor() {
    // Check if onboarding was already completed
    const completed = localStorage.getItem('calmi-onboarding-completed');
    if (!completed) {
      // You could automatically start it here if you wanted
      // this.start();
    }

    // Effect to persist when finished
    effect(() => {
      if (this._currentStep() > this._totalSteps) {
        localStorage.setItem('calmi-onboarding-completed', 'true');
        localStorage.setItem('calmi-onboarding-selections', JSON.stringify(this._selections()));
      }
    });
  }

  start(): void {
    this._currentStep.set(1);
    this._selections.set({ goal: null, soundPreference: null, duration: null });
    this._isActive.set(true);
  }

  close(): void {
    this._isActive.set(false);
  }

  nextStep(): void {
    if (this._currentStep() <= this._totalSteps) {
      this._currentStep.update(s => s + 1);
    }
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
    this.nextStep(); // Push past the final step to trigger the effect
    // Automatically close after a short delay
    setTimeout(() => {
      this.close();
    }, 1500);
  }
}
