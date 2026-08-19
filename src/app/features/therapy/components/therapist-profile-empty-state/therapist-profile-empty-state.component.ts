import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-therapist-profile-empty-state',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-2xl px-4 py-16 md:px-8" aria-labelledby="profile-not-found">
      <div class="rounded-2xl border border-hairline bg-surface p-6 shadow-card md:p-8">
        <h1 id="profile-not-found" class="font-sans text-3xl font-bold leading-tight text-ink md:text-5xl">Profile not found</h1>
        <p class="mt-4 text-base text-ink-soft">This therapist profile is unavailable. Return to Top Psychologists to choose another therapist.</p>
        <a [routerLink]="['/therapy']" fragment="top-psychologists"
           class="mt-6 inline-flex rounded-full bg-brand-deep px-5 py-3 text-base font-semibold text-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
          Browse psychologists
        </a>
      </div>
    </section>
  `,
})
export class TherapistProfileEmptyStateComponent {}
