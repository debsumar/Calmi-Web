import { Component, signal, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '@/shared/components/card/card.component';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { OnboardingService } from '@/features/onboarding/services/onboarding.service';

interface PricingPlan {
  name: string;
  icon: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'solid' | 'outline';
  highlight: boolean;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [LucideAngularModule, PrimaryButtonComponent],
  templateUrl: './pricing.component.html',
  styles: [`
    @keyframes fadeInUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }
  `]
})
export class PricingComponent {
  onboardingService = inject(OnboardingService);
  annualBilling = signal(true);

  getStarted() {
    this.onboardingService.start();
  }

  plans = computed<PricingPlan[]>(() => {
    const isAnnual = this.annualBilling();
    return [
      {
        name: 'Basic',
        icon: 'leaf',
        price: '$0',
        period: 'forever',
        description: 'Perfect to start your mindfulness journey.',
        features: [
          '3 essential ambient sounds',
          'Basic breathing exercises',
          '5 mins daily meditation',
          'Community access'
        ],
        buttonText: 'Get Started',
        buttonVariant: 'outline',
        highlight: false
      },
      {
        name: 'Premium',
        icon: 'zap',
        price: isAnnual ? '$5' : '$8',
        period: 'per month',
        description: 'Everything you need for deep relaxation.',
        features: [
          'All premium soundscapes',
          'Guided meditation sessions',
          'Offline listening mode',
          'Sleep stories & tracks',
          'Personalized insights'
        ],
        buttonText: 'Start 7-Day Free Trial',
        buttonVariant: 'solid',
        highlight: true
      },
      {
        name: 'Lifetime',
        icon: 'sparkles',
        price: '$199',
        period: 'one-time',
        description: 'Uninterrupted peace, forever.',
        features: [
          'Everything in Premium',
          'Pay once, yours forever',
          'Early access to new features',
          'Direct support from creators'
        ],
        buttonText: 'Get Lifetime',
        buttonVariant: 'outline',
        highlight: false
      }
    ];
  });

  toggleBilling() {
    this.annualBilling.update(v => !v);
  }
}
