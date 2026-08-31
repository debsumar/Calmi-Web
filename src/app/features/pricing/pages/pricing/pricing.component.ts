import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { OnboardingService } from '@/features/onboarding/services/onboarding.service';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

type PlanEmphasis = 'none' | 'recommended' | 'popular';
type PlanAction = 'start' | 'verifyStudent' | 'trial';
type BillingPeriod = 'monthly' | 'annual';
type PricePeriod = 'month' | 'year' | 'forever';

type BillingPrice = {
  value: string;
  period: PricePeriod;
};

interface PricingPlan {
  name: string;
  icon: string;
  monthly: BillingPrice;
  annual: BillingPrice;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'solid' | 'outline';
  emphasis: PlanEmphasis;
  badgeIcon?: string;
  badgeLabel?: string;
  action: PlanAction;
}

type DisplayedPricingPlan = PricingPlan & BillingPrice & {
  ribbonLabel: string | null;
  ariaLabel: string;
};

@Component({
  selector: 'app-pricing',
  imports: [LucideDynamicIcon, PrimaryButtonComponent, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  onboardingService = inject(OnboardingService);

  readonly billingPeriod = signal<BillingPeriod>('monthly');

  readonly plans: readonly PricingPlan[] = [
    {
      name: 'Free',
      icon: 'leaf',
      monthly: { value: '₹0', period: 'forever' },
      annual: { value: '₹0', period: 'forever' },
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
      monthly: { value: '₹99', period: 'month' },
      annual: { value: '₹999', period: 'year' },
      description: 'Everything you need for everyday self-reflection.',
      features: [
        'Everything in Free',
        'Limited Rumi AI conversations — 20–30 conversations/month',
        'Unlimited Guided Journaling',
        'Sleep Library',
        'Personalised Recommendations',
        'Mood Insights & Progress',
        'Notice Your Patterns.'
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
      monthly: { value: '₹249', period: 'month' },
      annual: { value: '₹2,399', period: 'year' },
      description: 'More room to reflect, understand and explore.',
      features: [
        'Everything in Student Premium',
        'Higher Rumi AI limits — 100–150 conversations/month',
        'Deeper Mood Insights',
        'Premium Sleep Journeys',
        'Therapist Session Discounts',
        'Exclusive Weekly Content',
        'Priority Support'
      ],
      buttonText: 'Start 7-Day Free Trial',
      buttonVariant: 'solid',
      emphasis: 'popular',
      action: 'trial'
    }
  ];

  readonly displayedPlans = computed<readonly DisplayedPricingPlan[]>(() => {
    const selectedPrice = this.billingPeriod();

    return this.plans.map((plan) => {
      const price = selectedPrice === 'annual' ? plan.annual : plan.monthly;
      const ribbonLabel = plan.emphasis === 'popular'
        ? 'Most Popular'
        : plan.emphasis === 'recommended'
          ? 'For Students'
          : null;

      return {
        ...plan,
        ...price,
        ribbonLabel,
        ariaLabel: price.period === 'forever'
          ? `${price.value} forever`
          : `${price.value} per ${price.period}`,
      };
    });
  });

  setBillingPeriod(period: BillingPeriod): void {
    this.billingPeriod.set(period);
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
