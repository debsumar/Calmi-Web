import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AuthImageSide = 'left' | 'right';

@Component({
  selector: 'app-auth-split-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-canvas px-4 py-6 font-sans text-ink sm:px-6 md:flex md:items-center md:justify-center md:px-8 md:py-10">
      <section class="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-card md:min-h-[38rem] md:flex-row" aria-label="Calmi authentication">
        <div
          [class]="imageSide() === 'left' ? 'order-1 flex min-h-56 flex-1 items-center justify-center bg-brand-deep p-8 md:order-1 md:min-h-0 md:p-12' : 'order-1 flex min-h-56 flex-1 items-center justify-center bg-brand-deep p-8 md:order-2 md:min-h-0 md:p-12'">
          <img [src]="imageSrc()" [alt]="imageAlt()" class="max-h-72 w-full max-w-md object-contain md:max-h-[30rem]" />
        </div>

        <div
          [class]="imageSide() === 'left' ? 'order-2 flex flex-1 flex-col bg-surface p-7 sm:p-10 md:order-2 md:p-14' : 'order-2 flex flex-1 flex-col bg-surface p-7 sm:p-10 md:order-1 md:p-14'">
          @if (showLogo()) {
            <div class="mb-8 flex justify-end">
              <img src="/assets/logo.avif" alt="Calmi logo" class="h-10 w-auto object-contain" />
            </div>
          }
          <div class="flex flex-1 flex-col justify-center">
            <ng-content />
          </div>
        </div>
      </section>
    </main>
  `,
})
export class AuthSplitCardComponent {
  readonly imageSrc = input.required<string>();
  readonly imageAlt = input.required<string>();
  readonly imageSide = input<AuthImageSide>('left');
  readonly showLogo = input(true);
}
