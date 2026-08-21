import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideStethoscope } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { Therapist } from '@/features/therapy/data/therapist.data';

@Component({
  selector: 'app-therapist-profile-about',
  imports: [LucideStethoscope, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-w-0" aria-labelledby="about-heading">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand" aria-hidden="true">
          <svg lucideStethoscope [size]="20" aria-hidden="true"></svg>
        </span>
        <h2 appAnimateOnScroll style="--index:0" id="about-heading" class="font-sans text-xl font-bold text-ink md:text-2xl">About {{ firstName() }}</h2>
      </div>
      <p appAnimateOnScroll style="--index:1" class="mt-5 text-base leading-relaxed text-ink-soft">{{ profile().bio }}</p>
    </section>
  `,
})
export class TherapistProfileAboutComponent {
  readonly profile = input.required<Therapist>();
  readonly firstName = computed(() => this.profile().name.split(' ')[0] ?? this.profile().name);
}
