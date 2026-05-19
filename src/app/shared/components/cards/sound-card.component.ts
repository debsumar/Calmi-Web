import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sound-card',
  imports: [LucideAngularModule],
  host: { class: 'block' },
  template: `
    <div class="relative rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer bg-gray-200 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10"></div>
      <img [src]="image()" [alt]="title()" class="absolute inset-0 w-full h-full object-cover">
      @if (showControls()) {
        <button class="absolute top-4 left-4 z-20 text-white/80 hover:text-white">
          <lucide-icon name="heart" [size]="18"></lucide-icon>
        </button>
        <button class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/60 rounded-full flex items-center justify-center group-hover:bg-black/80 transition-colors">
          <lucide-icon name="play" [size]="22" class="text-white ml-0.5"></lucide-icon>
        </button>
      }
      <div class="absolute bottom-4 left-4 z-20 text-white pointer-events-none">
        <p class="font-bold text-base">{{ title() }}</p>
        @if (description()) {
          <p class="text-white/70 text-sm">{{ description() }}</p>
        }
        <p class="text-white/50 text-xs mt-1">{{ duration() }}</p>
      </div>
    </div>
  `,
})
export class SoundCardComponent {
  title = input.required<string>();
  image = input.required<string>();
  duration = input('');
  description = input('');
  showControls = input(false);
}
