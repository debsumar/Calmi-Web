import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { OnboardingWizardComponent } from './features/onboarding/components/onboarding-wizard/onboarding-wizard.component';
import { OnboardingService } from './features/onboarding/services/onboarding.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, OnboardingWizardComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <p-toast />
    <router-outlet />
    @if (onboardingService.isActive()) {
      <app-onboarding-wizard />
    }
  `,
})
export class AppComponent {
  onboardingService = inject(OnboardingService);
}
