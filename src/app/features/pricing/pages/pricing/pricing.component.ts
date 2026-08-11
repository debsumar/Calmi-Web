import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { OnboardingService } from '@/features/onboarding/services/onboarding.service';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

type PlanEmphasis = 'none' | 'recommended' | 'popular';
type PlanAction = 'start' | 'verifyStudent' | 'trial';

interface PricingPlan {
  name: string;
  icon: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'solid' | 'outline';
  emphasis: PlanEmphasis;
  badgeIcon?: string;
  badgeLabel?: string;
  action: PlanAction;
}

@Component({
  selector: 'app-pricing',
  imports: [LucideDynamicIcon, PrimaryButtonComponent, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  onboardingService = inject(OnboardingService);

  readonly plans: readonly PricingPlan[] = [
    {
      name: 'Free',
      icon: 'leaf',
      price: '₹0',
      period: 'forever',
      description: 'Perfect for exploring Calmi.',
      features: [
        'Daily Mood Check-ins',
        'Basic Journaling',
        'Limited Sleep Sessions',
        'Access to Community',
        'Limited Rumi AI Conversations'
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline',
      emphasis: 'none',
      action: 'start'
    },
    {
      name: 'Student Premium',
      icon: 'graduation-cap',
      price: '₹99',
      period: 'per month',
      description: 'Built for students who need affordable mental wellness support.',
      features: [
        'Everything in Free',
        'Unlimited Sleep Library',
        'Unlimited Guided Journals',
        'Unlimited Rumi AI',
        'Personalized Recommendations',
        'Mood Insights & Progress',
        'Early Access to New Features'
      ],
      buttonText: 'Verify Student Status',
      buttonVariant: 'outline',
      emphasis: 'recommended',
      badgeIcon: 'graduation-cap',
      badgeLabel: 'Student Plan',
      action: 'verifyStudent'
    },
    {
      name: 'Premium',
      icon: 'sparkles',
      price: '₹249',
      period: 'per month',
      description: 'Complete mental wellness for every stage of your journey.',
      features: [
        'Everything in Student Premium',
        'Priority AI Responses',
        'Therapist Session Discounts',
        'Advanced Mood Analytics',
        'Premium Sleep Journeys',
        'Priority Customer Support',
        'Exclusive Weekly Content'
      ],
      buttonText: 'Start 7-Day Free Trial',
      buttonVariant: 'solid',
      emphasis: 'popular',
      action: 'trial'
    }
  ];

  ribbonLabel(emphasis: PlanEmphasis): string | null {
    return emphasis === 'popular' ? 'Most Popular' : emphasis === 'recommended' ? 'Recommended' : null;
  }

  ariaPrice(plan: PricingPlan): string {
    return `${plan.price} ${plan.period}`;
  }

  onPlanAction(plan: PricingPlan): void {
    switch (plan.action) {
      case 'verifyStudent':
        this.startStudentVerification();
        return;
      case 'trial':
      case 'start':
      default:
        this.onboardingService.start();
    }
  }

  startStudentVerification(): void {
    this.onboardingService.start({ studentVerification: true });
  }
}
