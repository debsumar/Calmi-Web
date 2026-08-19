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
              class="bg-white dark:bg-elevated text-brand dark:text-brand-light border border-transparent dark:border-hairline font-semibold px-8 py-4 rounded-full text-lg hover:shadow-lg transition-shadow flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-brand-dark dark:disabled:text-brand-light disabled:border-hairline disabled:opacity-80 disabled:hover:shadow-none">
        {{ label() }}
        @if (icon()) {
          <span class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-brand dark:border-brand-light">
            <svg [lucideIcon]="icon()!" [size]="16"></svg>
          </span>
        }
      </button>
    } @else {
      <button (click)="clicked.emit()"
              [disabled]="disabled()"
              [attr.aria-disabled]="disabled() ? 'true' : null"
              class="bg-brand-deep text-white font-semibold px-8 py-3 rounded-full text-base hover:bg-brand-dark hover:shadow-lg transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-brand-dark dark:disabled:text-brand-light disabled:border disabled:border-hairline disabled:opacity-80 disabled:shadow-none disabled:hover:bg-sunken disabled:hover:shadow-none">
        {{ label() }}
        @if (icon()) {
          <span class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-white/60">
            <svg [lucideIcon]="icon()!" [size]="16"></svg>
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
  clicked = output();
}
