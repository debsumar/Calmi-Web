import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-canvas px-6 py-10 font-sans text-ink md:px-12">
      <div class="mx-auto max-w-3xl rounded-3xl border border-hairline bg-surface p-8 shadow-card md:p-12">
        <a routerLink="/auth/signup" class="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Back to Sign Up</a>
        <h1 class="mt-8 text-3xl font-bold leading-tight text-ink md:text-5xl">{{ title }}</h1>
        <p class="mt-5 text-base leading-relaxed text-ink-soft">Calmi is preparing this {{ title }} page. Please check back soon for the full policy.</p>
      </div>
    </main>
  `,
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string;
}
