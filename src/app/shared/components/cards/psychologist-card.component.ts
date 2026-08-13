import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';

@Component({
  selector: 'app-psychologist-card',
  imports: [LucideDynamicIcon, DragScrollDirective],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="h-full bg-surface rounded-2xl p-4 shadow-card flex flex-col">
      <!-- Portrait -->
      <div class="relative rounded-2xl overflow-hidden aspect-[4/3] bg-brand/15 dark:bg-brand/20">
        @if (image()) {
          <img [src]="image()" [alt]="'Portrait of ' + name()" class="absolute inset-0 w-full h-full object-cover">
        } @else {
          <span aria-hidden="true"
                class="absolute inset-0 flex items-center justify-center text-5xl font-bold text-brand dark:text-brand-light">
            {{ initials() }}
          </span>
        }
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

        @if (available()) {
          <span class="absolute bottom-14 left-3 inline-flex items-center gap-1.5 bg-white/95 dark:bg-black/70 rounded-full px-2.5 py-1 text-xs font-semibold text-gray-900 dark:text-gray-100">
            <span aria-hidden="true" class="w-2 h-2 rounded-full bg-green-500"></span>
            Available
          </span>
        }
        <p class="absolute bottom-3 left-3 right-3 text-white text-xl font-bold truncate">{{ name() }}</p>
      </div>

      <!-- Price + rating -->
      <div class="flex items-baseline justify-between gap-2 mt-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          <span class="font-bold text-gray-900 dark:text-gray-100">₹{{ price() }}</span> for {{ duration() }}
        </p>
        <p class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 shrink-0">
          <svg [lucideIcon]="'star'" [size]="14" class="text-amber-400 fill-amber-400"></svg>
          <span class="font-semibold text-gray-900 dark:text-gray-100">{{ rating() }}</span>
          <span class="text-xs">({{ reviews() }})</span>
        </p>
      </div>

      <!-- Specialities -->
      <div appDragScroll
           (mousedown)="$event.stopPropagation()"
           (touchstart)="$event.stopPropagation()"
           class="flex gap-2 mt-3 overflow-x-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        @for (tag of specialties(); track tag) {
          <span class="shrink-0 whitespace-nowrap border border-gray-200 dark:border-white/10 rounded-full px-2.5 py-1 text-[11px] text-gray-700 dark:text-gray-300">
            {{ tag }}
          </span>
        }
      </div>

      <!-- Languages -->
      <p class="text-xs text-gray-600 dark:text-gray-400 mt-3">
        <span class="font-semibold text-gray-800 dark:text-gray-200">Speaks:</span> {{ languages().join(', ') }}
      </p>

      <button type="button" (click)="booked.emit()"
              class="mt-5 w-full bg-brand text-white font-semibold text-sm rounded-full py-3 hover:bg-brand-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
        Book Session
      </button>
    </div>
  `,
})
export class PsychologistCardComponent {
  name = input.required<string>();
  price = input.required<number>();
  duration = input.required<string>();
  rating = input.required<number>();
  reviews = input.required<number>();
  specialties = input.required<string[]>();
  languages = input.required<string[]>();
  image = input('');
  available = input(true);
  booked = output();

  initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  );
}
