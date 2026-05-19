import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-onboarding-wizard',
  imports: [LucideAngularModule],
  templateUrl: './onboarding-wizard.component.html',
  styles: [`
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseSoft {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    .animate-slide-up {
      animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-pulse-soft {
      animation: pulseSoft 3s ease-in-out infinite;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class OnboardingWizardComponent {
  onboardingService = inject(OnboardingService);

  goals = [
    { id: 'anxiety', icon: 'frown', title: 'Reduce anxiety', desc: 'Find calm in stressful moments' },
    { id: 'sleep', icon: 'moon', title: 'Sleep better', desc: 'Drift off to peaceful rest' },
    { id: 'focus', icon: 'brain', title: 'Improve focus', desc: 'Clear the noise, stay sharp' },
    { id: 'mindfulness', icon: 'leaf', title: 'Daily mindfulness', desc: 'Build a healthy mental habit' }
  ];

  sounds = [
    { id: 'rain', icon: 'cloud-rain', title: 'Rain' },
    { id: 'ocean', icon: 'waves', title: 'Ocean Waves' },
    { id: 'noise', icon: 'audio-lines', title: 'White Noise' },
    { id: 'ambient', icon: 'sun', title: 'Ambient' },
    { id: 'fire', icon: 'flame', title: 'Fireplace' },
    { id: 'nature', icon: 'tree-pine', title: 'Nature' }
  ];

  durations = [
    { id: '5min', title: '5 mins', desc: 'Just a quick breather' },
    { id: '15min', title: '15 mins', desc: 'A solid mental break' },
    { id: '30min', title: '30+ mins', desc: 'Deep, immersive focus' }
  ];

  selectGoal(id: string) {
    this.onboardingService.setSelection('goal', id);
    this.onboardingService.nextStep();
  }

  selectSound(id: string) {
    this.onboardingService.setSelection('soundPreference', id);
    this.onboardingService.nextStep();
  }

  selectDuration(id: string) {
    this.onboardingService.setSelection('duration', id);
    this.onboardingService.finish();
  }
}
