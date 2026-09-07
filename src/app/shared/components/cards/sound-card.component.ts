import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-sound-card',
  imports: [LucideDynamicIcon],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [class]="'relative rounded-2xl overflow-hidden group bg-sunken shadow-card transition-shadow ' + (size() === 'lg' ? 'aspect-[3/4]' : size() === 'sm' ? 'aspect-[16/9]' : 'aspect-[4/3]') + (isActive() ? ' ring-2 ring-brand' : '')">
      <div class="absolute inset-0 z-10 bg-gradient-to-t from-scrim-strong via-scrim to-transparent"></div>
      <img [src]="image()" [alt]="title()" class="absolute inset-0 w-full h-full object-cover">
      <button type="button" (click)="played.emit()" [attr.aria-label]="'Play ' + title()" class="absolute inset-0 z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"></button>
      @if (showControls()) {
        <button (click)="toggleLike($event)"
                class="absolute top-4 left-4 z-30 transition-transform duration-200"
                [attr.aria-label]="liked() ? 'Remove ' + title() + ' from favorites' : 'Add ' + title() + ' to favorites'"
                [attr.aria-pressed]="liked()"
                [class]="liked() ? 'text-danger scale-125' : 'text-on-media hover:text-on-media scale-100'">
          <svg [lucideIcon]="'heart'" [size]="18" [class]="liked() ? 'fill-current' : ''" aria-hidden="true"></svg>
        </button>
        @if (isActive()) {
          <button (click)="togglePause($event)"
                  [attr.aria-label]="isPaused() ? 'Play ' + title() : 'Pause ' + title()"
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-scrim-strong rounded-full flex items-center justify-center cursor-pointer hover:bg-scrim transition-colors">
            <svg [lucideIcon]="isPaused() ? 'play' : 'pause'" [size]="22" class="text-on-media fill-current" aria-hidden="true"></svg>
          </button>
        } @else {
          <button (click)="played.emit()" [attr.aria-label]="'Play ' + title()" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-scrim-strong rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-scrim transition-all duration-300 scale-75 group-hover:scale-100">
            <svg [lucideIcon]="'play'" [size]="22" class="text-on-media ml-0.5 fill-current" aria-hidden="true"></svg>
          </button>
        }
      }
      @if (!showControls() && isActive()) {
        <div class="absolute top-4 right-4 z-20 w-10 h-10 bg-scrim-strong rounded-full flex items-center justify-center">
          <div class="equalizer" [class.paused]="isPaused()">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
      }
      <div class="absolute bottom-4 left-4 z-20 text-on-media pointer-events-none">
        <p class="text-lg font-bold">{{ title() }}</p>
        @if (description()) {
          <p class="text-on-media text-base">{{ description() }}</p>
        }
        <p class="text-on-media text-xs mt-1">{{ duration() }}</p>
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
  paused = output();

  liked = signal(false);

  toggleLike(event: Event): void {
    event.stopPropagation();
    this.liked.update(v => !v);
  }

  togglePause(event: Event): void {
    event.stopPropagation();
    this.paused.emit();
  }
}
