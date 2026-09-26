import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  LucideBriefcaseBusiness,
  LucideMedal,
  LucideTarget,
} from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { BreadcrumbComponent } from '@/shared/components/breadcrumb/breadcrumb.component';
import { Therapist } from '@/features/therapy/data/therapist.data';

@Component({
  selector: 'app-therapist-profile-hero',
  imports: [BreadcrumbComponent, LucideTarget, LucideBriefcaseBusiness, LucideMedal, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full bg-canvas text-ink">
      <app-breadcrumb [backLink]="['/therapy']" backLabel="Top Experts" currentPage="Therapist Profile" fragment="top-psychologists" navClass="mx-auto max-w-6xl px-4 pt-4 md:px-8 md:pt-6" />
    </div>

    <section class="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12" aria-labelledby="therapist-name">
      <article class="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
        <div class="grid gap-8 p-5 md:grid-cols-2 md:items-center md:gap-10 md:p-8 lg:grid-cols-[14rem_minmax(18rem,1fr)_minmax(23rem,1.35fr)]">
          @if (profile().image) {
            <img [src]="profile().image" [alt]="'Portrait of ' + profile().name"
                 decoding="async"
                 class="mx-auto h-48 w-auto max-w-full rounded-2xl border border-hairline object-contain md:h-60">
          } @else {
            <div role="img" [attr.aria-label]="'Placeholder avatar for ' + profile().name"
                 class="mx-auto flex aspect-square w-40 items-center justify-center rounded-2xl border border-hairline bg-sunken md:w-56">
              <span aria-hidden="true" class="font-sans text-3xl font-bold text-brand-deep md:text-5xl">{{ initials() }}</span>
            </div>
          }

          <div class="min-w-0">
            <h1 appAnimateOnScroll id="therapist-name" style="--index:0" class="font-sans text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">{{ profile().name }}</h1>
            <p appAnimateOnScroll style="--index:1" class="mt-3 text-base text-ink-soft">{{ profile().subtitle }}</p>
            <div appAnimateOnScroll style="--index:2" class="mt-6 grid gap-3 text-xs font-semibold text-ink-soft" aria-label="Professional experience">
              <div class="flex items-center gap-3">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                  <svg lucideMedal [size]="18" class="fill-current text-ink-soft"></svg>
                </span>
                <span>{{ profile().qualifications.join(', ') }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                  <svg lucideBriefcaseBusiness [size]="18" class="fill-current text-ink-soft"></svg>
                </span>
                <span>{{ profile().experienceYears }} years of experience</span>
              </div>
            </div>
          </div>

          <section class="min-w-0 border-t border-hairline pt-8 md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" aria-labelledby="expertise-heading">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand-deep" aria-hidden="true">
                <svg lucideTarget [size]="20" aria-hidden="true"></svg>
              </span>
              <h2 appAnimateOnScroll style="--index:3" id="expertise-heading" class="font-sans text-3xl font-bold leading-tight text-ink md:text-4xl">Areas of Expertise</h2>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              @for (specialty of profile().specialties; track specialty) {
                <span class="rounded-full border border-brand-light bg-surface px-4 py-2 text-xs text-ink">{{ specialty }}</span>
              }
            </div>
          </section>
        </div>

        <div class="grid grid-cols-1 bg-brand-deep text-on-brand-deep sm:grid-cols-2 md:grid-cols-4">
          @for (stat of stats(); track stat.label) {
            <div class="border-b border-brand-light p-5 text-center last:border-b-0 sm:border-r sm:border-b-0 md:last:border-r-0">
              <p class="break-words text-base font-bold">{{ stat.value }}</p>
              <p class="mt-1 text-xs font-semibold">{{ stat.label }}</p>
            </div>
          }
        </div>
      </article>
    </section>
  `,
})
export class TherapistProfileHeroComponent {
  readonly profile = input.required<Therapist>();
  readonly initials = computed(() => this.profile().name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join(''));
  readonly stats = computed(() => [
    { label: 'Session Fee', value: `₹${this.profile().price}` },
    { label: 'Duration', value: this.profile().duration },
    { label: 'Session Mode', value: this.profile().sessionMode },
    { label: 'Language Fluency', value: this.profile().languages.join(', ') },
  ]);
}
