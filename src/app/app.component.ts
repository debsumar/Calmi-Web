import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OnboardingWizardComponent } from './features/onboarding/components/onboarding-wizard/onboarding-wizard.component';
import { OnboardingService } from './features/onboarding/services/onboarding.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OnboardingWizardComponent],
  template: `
    <router-outlet />
    @if (onboardingService.isActive()) {
      <app-onboarding-wizard />
    }
  `,
})
export class AppComponent {
  onboardingService = inject(OnboardingService);
}
