import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideCircleCheck, LucideCircleQuestionMark, LucideHandHeart, LucideShieldCheck, LucideSprout } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { TherapistWhyChooseUs } from '@/features/therapy/data/therapist.data';

@Component({
  selector: 'app-therapist-why-choose-us',
  imports: [LucideHandHeart, LucideShieldCheck, LucideSprout, LucideCircleCheck, LucideCircleQuestionMark, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-w-0 pt-10 md:pt-14" aria-labelledby="why-heading">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand" aria-hidden="true">
          <svg lucideCircleQuestionMark [size]="20" aria-hidden="true"></svg>
        </span>
        <h2 appAnimateOnScroll style="--index:0" id="why-heading" class="font-sans text-xl font-bold text-ink md:text-2xl">Why Choose Us?</h2>
      </div>
      <ul class="mt-6 grid grid-cols-2 gap-x-6 gap-y-8" aria-label="Reasons to choose this therapist">
        @for (benefit of benefits(); track benefit.id) {
          <li class="flex min-w-0 flex-col items-center gap-3 text-center">
            <span class="text-brand-deep" aria-hidden="true">
              @switch (benefit.id) {
                @case ('personalized-approach') { <svg lucideHandHeart [size]="40" aria-hidden="true"></svg> }
                @case ('safe-non-judgmental') { <svg lucideShieldCheck [size]="40" aria-hidden="true"></svg> }
                @case ('holistic-perspective') { <svg lucideSprout [size]="40" aria-hidden="true"></svg> }
                @case ('evidence-informed-care') { <svg lucideCircleCheck [size]="40" aria-hidden="true"></svg> }
              }
            </span>
            <span class="min-w-0 text-base text-ink">{{ benefit.label }}</span>
          </li>
        }
      </ul>
    </section>
  `,
})
export class TherapistWhyChooseUsComponent {
  readonly benefits = input.required<TherapistWhyChooseUs[]>();
}
