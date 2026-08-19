import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideBriefcaseBusiness,
  LucideMedal,
  LucideTarget,
} from '@lucide/angular';
import { Therapist } from '@/features/therapy/data/therapist.data';

@Component({
  selector: 'app-therapist-profile-hero',
  imports: [RouterLink, LucideArrowLeft, LucideTarget, LucideBriefcaseBusiness, LucideMedal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full bg-brand-deep text-on-brand">
      <nav aria-label="Breadcrumb" class="mx-auto max-w-6xl px-4 py-4 md:px-8">
        <ol class="flex flex-wrap items-center gap-2 text-xs">
          <li>
            <a [routerLink]="['/therapy']" fragment="top-psychologists"
               class="inline-flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep">
              <svg lucideArrowLeft [size]="16" aria-hidden="true"></svg>
              <span>Top Psychologists</span>
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Therapist Profile</li>
        </ol>
      </nav>
    </div>

    <section class="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12" aria-labelledby="therapist-name">
      <article class="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
        <div class="grid gap-8 p-5 md:grid-cols-2 md:items-center md:gap-10 md:p-8 lg:grid-cols-[14rem_minmax(18rem,1fr)_minmax(23rem,1.35fr)]">
          <div role="img" [attr.aria-label]="'Placeholder avatar for ' + profile().name"
               class="mx-auto flex aspect-square w-40 items-center justify-center rounded-2xl border border-hairline bg-sunken md:w-56">
            <span aria-hidden="true" class="font-sans text-3xl font-bold text-brand-deep md:text-5xl">{{ initials() }}</span>
          </div>

          <div class="min-w-0">
            <h1 id="therapist-name" class="font-sans text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">{{ profile().name }}</h1>
            <p class="mt-3 text-base text-ink-soft">{{ profile().subtitle }}</p>
            <div class="mt-6 grid gap-3 text-xs font-semibold text-ink-soft" aria-label="Professional experience">
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
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand" aria-hidden="true">
                <svg lucideTarget [size]="20" aria-hidden="true"></svg>
              </span>
              <h2 id="expertise-heading" class="font-sans text-xl font-bold leading-tight whitespace-nowrap text-ink md:text-2xl">Areas of Expertise</h2>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              @for (specialty of profile().specialties; track specialty) {
                <span class="rounded-full border border-brand-light bg-surface px-4 py-2 text-xs text-ink">{{ specialty }}</span>
              }
            </div>
          </section>
        </div>

        <div class="grid grid-cols-1 bg-brand-deep text-on-brand sm:grid-cols-2 md:grid-cols-4">
          @for (stat of stats(); track stat.label) {
            <div class="border-b border-brand-light/40 p-5 text-center last:border-b-0 sm:border-r sm:border-b-0 md:last:border-r-0">
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
