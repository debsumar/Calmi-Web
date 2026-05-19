import { Component, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sound-card',
  imports: [LucideAngularModule],
  host: { class: 'block' },
  template: `
    <div (click)="played.emit()" [class]="'relative rounded-2xl overflow-hidden group cursor-pointer bg-gray-200 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow ' + (size() === 'lg' ? 'aspect-[3/4]' : size() === 'sm' ? 'aspect-[16/9]' : 'aspect-[4/3]') + (isActive() ? ' ring-2 ring-brand/60' : '')">
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10"></div>
      <img [src]="image()" [alt]="title()" class="absolute inset-0 w-full h-full object-cover">
      @if (showControls()) {
        <button (click)="toggleLike($event)"
                class="absolute top-4 left-4 z-20 transition-transform duration-200"
                [class]="liked() ? 'text-red-500 scale-125' : 'text-white/80 hover:text-white scale-100'">
          <lucide-icon name="heart" [size]="18" [class]="liked() ? 'fill-red-500' : ''"></lucide-icon>
        </button>
        @if (isActive()) {
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/60 rounded-full flex items-center justify-center">
            <div class="equalizer" [class.paused]="isPaused()">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        } @else {
          <button class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/60 rounded-full flex items-center justify-center group-hover:bg-black/80 transition-colors">
            <lucide-icon name="play" [size]="22" class="text-white ml-0.5"></lucide-icon>
          </button>
        }
      }
      @if (!showControls() && isActive()) {
        <div class="absolute top-4 right-4 z-20 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
          <div class="equalizer" [class.paused]="isPaused()">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
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
  size = input<'default' | 'sm' | 'lg'>('default');
  isActive = input(false);
  isPaused = input(false);
  played = output();

  liked = signal(false);

  toggleLike(event: Event): void {
    event.stopPropagation();
    this.liked.update(v => !v);
  }
}
