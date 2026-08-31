import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-download',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="bg-canvas text-ink">
      <section class="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 md:px-8 md:pb-24 md:pt-6" aria-labelledby="download-title">
        <nav aria-label="Breadcrumb" class="mb-10 md:mb-16">
          <ol class="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <li>
              <a routerLink="/home"
                 class="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-brand-deep transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
                <span aria-hidden="true" class="text-base">←</span>
                <span>Back to home</span>
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Download app</li>
          </ol>
        </nav>

        <div class="grid items-center gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)] md:gap-8 lg:gap-16">
          <div class="min-w-0 max-w-xl md:order-2">
            <p class="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-deep">Calmi in your pocket</p>
            <h1 id="download-title" class="font-sans text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl md:text-5xl">
              Make Space for your Mind.
            </h1>
            <p class="mt-6 text-lg leading-relaxed text-ink-soft">
              Find a little more room to breathe with mood check-ins, guided tools, journaling, and thoughtful reflections from Rumi AI—all in one gentle space.
            </p>
            <p class="mt-5 text-base font-semibold text-brand-deep">Calmi — Mental Wellness App. Coming soon.</p>

            <div class="mt-8" aria-label="App stores, coming soon">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Available soon on</p>
              <div class="flex flex-wrap gap-3">
                <div data-store="apple" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-hairline bg-elevated px-3 py-2 text-ink">
                  <img src="/assets/logos/apple.svg" alt="" aria-hidden="true" class="h-6 w-auto" decoding="async">
                  <span class="text-sm font-semibold">App Store</span>
                </div>
                <div data-store="google-play" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-hairline bg-elevated px-3 py-2 text-ink">
                  <img src="/assets/logos/Playstore.svg" alt="" aria-hidden="true" class="h-6 w-auto" decoding="async">
                  <span class="text-sm font-semibold">Google Play</span>
                </div>
              </div>
            </div>
          </div>

          <figure class="relative isolate mx-auto w-full max-w-xl md:order-1" aria-label="Calmi mobile app previews">
            <img src="assets/Android.png"
                 alt="Rumi AI mobile app screen"
                 loading="lazy"
                 decoding="async"
                 class="relative z-10 mx-auto h-auto w-[72%] max-w-full select-none object-contain md:absolute md:right-0 md:top-10 md:w-[48%]"
            >
            <img src="assets/iPhone.png"
                 alt="Calmi home mobile app screen"
                 loading="lazy"
                 decoding="async"
                 class="relative z-20 -mt-20 ml-[8%] h-auto w-[80%] max-w-full select-none object-contain md:ml-0 md:mt-0 md:w-[57%]"
            >
          </figure>
        </div>
      </section>
    </div>
  `,
})
export class DownloadComponent {}
