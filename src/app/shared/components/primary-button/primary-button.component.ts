import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-primary-button',
  imports: [LucideAngularModule],
  template: `
    @if (variant() === 'outline') {
      <button (click)="clicked.emit()"
              class="bg-white text-brand font-semibold px-8 py-4 rounded-full text-lg hover:shadow-lg transition-shadow flex items-center gap-3">
        {{ label() }}
        @if (icon()) {
          <span class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-brand">
            <lucide-icon [name]="icon()!" [size]="16"></lucide-icon>
          </span>
        }
      </button>
    } @else {
      <button (click)="clicked.emit()"
              class="bg-brand text-white font-semibold px-8 py-3 rounded-full text-base hover:bg-brand-dark hover:shadow-lg transition-all flex items-center gap-3">
        {{ label() }}
        @if (icon()) {
          <span class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-white/60">
            <lucide-icon [name]="icon()!" [size]="16"></lucide-icon>
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
  clicked = output();
}
