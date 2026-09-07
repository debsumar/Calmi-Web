import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-primary-button',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (variant() === 'outline') {
      <button (click)="clicked.emit()"
              [disabled]="disabled()"
              [attr.aria-disabled]="disabled() ? 'true' : null"
              [class.w-full]="fullWidth()"
              [class.justify-center]="fullWidth()"
              class="flex items-center gap-3 rounded-full border border-brand bg-surface px-8 py-4 text-base font-semibold text-ink transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-sunken disabled:text-ink-muted disabled:opacity-80 disabled:hover:shadow-none">
        {{ label() }}
        @if (icon()) {
          <span class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-brand">
            <svg [lucideIcon]="icon()!" [size]="16"></svg>
          </span>
        }
      </button>
    } @else {
      <button (click)="clicked.emit()"
              [disabled]="disabled()"
              [attr.aria-disabled]="disabled() ? 'true' : null"
              [class.w-full]="fullWidth()"
              [class.justify-center]="fullWidth()"
              class="flex items-center gap-3 rounded-full bg-brand-deep px-8 py-4 text-base font-semibold text-on-brand-deep transition-all hover:bg-brand-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-hairline disabled:bg-sunken disabled:text-ink-muted disabled:shadow-none disabled:active:scale-100 disabled:hover:shadow-none">
        {{ label() }}
        @if (icon() && !disabled()) {
          <span aria-hidden="true" class="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-brand-light text-ink">
            <svg [lucideIcon]="icon()!" [size]="14"></svg>
          </span>
        }
      </button>
    }
  `,
})
export class PrimaryButtonComponent {
  label = input('Button');
  icon = input<string | null>(null);
  variant = input<'solid' | 'outline'>('solid');
  disabled = input(false);
  fullWidth = input(false);
  clicked = output();
}
