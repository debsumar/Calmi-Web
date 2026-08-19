import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { TherapyFaq } from '@/features/therapy/data/faq.data';

@Component({
  selector: 'app-faq-accordion',
  imports: [LucideChevronDown, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq-accordion.component.html',
})
export class FaqAccordionComponent {
  readonly faqs = input.required<readonly TherapyFaq[]>();
  readonly heading = input('Frequently Asked Questions');
  readonly subtitle = input('Find answers to common questions about using Calmi and supporting your mental well-being.');
  readonly sectionId = input('faq');
  readonly idPrefix = input('faq');
  readonly openFaq = signal<number | null>(null);

  toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? null : index));
  }
}
