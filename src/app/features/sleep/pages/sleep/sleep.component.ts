import { Component, signal, computed, ViewChild, ElementRef, afterNextRender, HostListener, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';
import { SoundCardComponent } from '@/shared/components/cards/sound-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { PlayerService, SoundTrack } from '@/core/services/player.service';

type VibeKey = 'all' | 'rain' | 'ocean' | 'nature' | 'ambient' | 'white-noise' | 'fireplace';

export interface SleepTrack extends SoundTrack {
  vibe: Exclude<VibeKey, 'all'>;
}

export interface SleepListTrack extends SleepTrack {
  category: string;
  categoryColor: string;
}

/** Fallback when the first card cannot be measured (jsdom / not yet laid out): 260px card + 24px gap. */
const FALLBACK_CARD_STEP = 284;
const SEEK_KEY_STEP_SECONDS = 5;

@Component({
  selector: 'app-sleep',
  imports: [LucideDynamicIcon, DragScrollDirective, SoundCardComponent, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sleep.component.html',
})
export class SleepComponent {
  playerService = inject(PlayerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shadowTimers: ReturnType<typeof setTimeout>[] = [];
  @ViewChild('carousel', { static: false }) carouselRef?: ElementRef<HTMLElement>;

  showLeftShadow = signal(false);
  showRightShadow = signal(true);
  activeSlide = signal(0);

  constructor() {
    this.destroyRef.onDestroy(() => this.shadowTimers.forEach((t) => clearTimeout(t)));
    afterNextRender(() => {
      this.checkShadows();
      for (const delay of [100, 300, 600]) {
        this.shadowTimers.push(setTimeout(() => this.checkShadows(), delay));
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkShadows();
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    this.updateShadows(element);
  }

  checkShadows(): void {
    if (this.carouselRef) {
      this.updateShadows(this.carouselRef.nativeElement);
    }
  }

  updateShadows(element: HTMLElement): void {
    const scrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    this.showLeftShadow.set(scrollLeft > 10);
    if (maxScrollLeft > 10) {
      this.showRightShadow.set(scrollLeft < maxScrollLeft - 10);
    } else {
      this.showRightShadow.set(false);
    }
    const slide = Math.round(scrollLeft / this.measureCardStep(element));
    this.activeSlide.set(Math.min(Math.max(slide, 0), Math.max(0, this.featuredSounds().length - 1)));
  }

  private measureCardStep(element: HTMLElement): number {
    const first = element.firstElementChild as HTMLElement | null;
    const width = first?.offsetWidth ?? 0;
    if (width <= 0) return FALLBACK_CARD_STEP;
    const gap = parseFloat(getComputedStyle(element).columnGap);
    return width + (Number.isFinite(gap) ? gap : 24);
  }

  vibes = signal<{ key: VibeKey; icon: string; label: string }[]>([
    { key: 'all', icon: 'waves-horizontal', label: 'All Sounds' },
    { key: 'rain', icon: 'cloud-rain', label: 'Rain' },
    { key: 'ocean', icon: 'waves-horizontal', label: 'Ocean' },
    { key: 'nature', icon: 'tree-pine', label: 'Nature' },
    { key: 'ambient', icon: 'sun', label: 'Ambient' },
    { key: 'white-noise', icon: 'audio-lines', label: 'White Noise' },
    { key: 'fireplace', icon: 'flame', label: 'Fireplace' },
  ]);
  activeVibe = signal<VibeKey>('all');
  searchQuery = signal('');
  favorites = signal<ReadonlySet<string>>(new Set());

  // Ids are unique per row; the same title may appear in both lists with different ids.
  featuredSounds = signal<SleepTrack[]>([
    { id: 'featured-rain-on-window', vibe: 'rain', title: 'Rain on Window', description: 'Gentle rain to calm your mind', duration: '45:00', image: 'assets/sound-images/rain-window.avif', audio: 'assets/sounds/rain.mp3' },
    { id: 'featured-ocean-waves', vibe: 'ocean', title: 'Ocean Waves', description: 'Waves to relax and let go', duration: '60:00', image: 'assets/sound-images/ocean-waves.avif' },
    { id: 'featured-night-ambience', vibe: 'ambient', title: 'Night Ambience', description: 'Feel the quiet of the night', duration: '60:00', image: 'assets/sound-images/night-ambience.avif' },
    { id: 'featured-bamboo-forest', vibe: 'nature', title: 'Bamboo Forest', description: 'Immersive birds and leaves rustling', duration: '1:00:00', image: 'assets/sound-images/bamboo-forest.avif' },
    { id: 'featured-heavy-rain', vibe: 'rain', title: 'Heavy Rain', description: 'Deep rain to drown out noise', duration: '45:00', image: 'assets/sound-images/heavy-rain.avif', audio: 'assets/sounds/rain.mp3' },
    { id: 'featured-fireplace', vibe: 'fireplace', title: 'Fireplace', description: 'Crackling fire for cozy evenings', duration: '50:00', image: 'assets/sound-images/fireplace.avif' },
    { id: 'featured-calming-ocean', vibe: 'ocean', title: 'Calming Ocean', description: 'Peaceful ocean for deep focus', duration: '30:00', image: 'assets/sound-images/caliming-ocean.avif' },
    { id: 'featured-deep-forest', vibe: 'nature', title: 'Deep Forest', description: 'Dense forest with ambient wildlife', duration: '45:00', image: 'assets/sound-images/forest.avif' },
    { id: 'featured-steady-rain', vibe: 'rain', title: 'Steady Rain', description: 'Consistent rain for sleep', duration: '30:00', image: 'assets/sound-images/rain.avif' },
  ]);

  allSounds = signal<SleepListTrack[]>([
    { id: 'all-night-ambience', vibe: 'ambient', title: 'Night Ambience', category: 'Ambient', categoryColor: 'bg-sunken text-ink-soft', description: 'Crickets, breeze and calm night', duration: '60:00', image: 'assets/sound-images/night-ambience.avif' },
    { id: 'all-heavy-rain', vibe: 'rain', title: 'Heavy Rain', category: 'Rain', categoryColor: 'bg-sunken text-ink-soft', description: 'Deep rain for deep sleep', duration: '45:00', image: 'assets/sound-images/heavy-rain.avif', audio: 'assets/sounds/rain.mp3' },
    { id: 'all-calming-ocean', vibe: 'ocean', title: 'Calming Ocean', category: 'Ocean', categoryColor: 'bg-sunken text-ink-soft', description: 'Gentle waves and horizon', duration: '30:00', image: 'assets/sound-images/ocean-waves.avif' },
    { id: 'all-cozy-fireplace', vibe: 'fireplace', title: 'Cozy Fireplace', category: 'Fireplace', categoryColor: 'bg-sunken text-ink-soft', description: 'Crackling fire to relax', duration: '15:00', image: 'assets/sound-images/fireplace.avif' },
  ]);

  /** All Sounds list after the vibe filter and the search box are applied. */
  visibleSounds = computed(() => {
    const vibe = this.activeVibe();
    const query = this.searchQuery().trim().toLowerCase();
    return this.allSounds().filter((s) =>
      (vibe === 'all' || s.vibe === vibe) &&
      (!query || `${s.title} ${s.description} ${s.category}`.toLowerCase().includes(query)));
  });

  selectVibe(key: VibeKey): void {
    this.activeVibe.set(key);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  isFavorite(track: SoundTrack): boolean {
    return this.favorites().has(track.id);
  }

  toggleFavorite(track: SoundTrack): void {
    this.favorites.update((current) => {
      const next = new Set(current);
      if (!next.delete(track.id)) next.add(track.id);
      return next;
    });
  }

  isPlayable(track: SoundTrack): boolean {
    return !!track.audio;
  }

  playSound(track: SoundTrack, list?: SoundTrack[]): void {
    this.playerService.play(track, list);
  }

  /** True when the track occupies the footer player, playing or paused. Identity is the id, never the title. */
  isCurrentTrack(track: SoundTrack): boolean {
    return this.playerService.nowPlaying()?.id === track.id;
  }

  /** True only while the track is actively playing, so icons mirror the footer. */
  isTrackPlaying(track: SoundTrack): boolean {
    return this.isCurrentTrack(track) && this.playerService.isPlaying();
  }

  /** Re-selecting the current track toggles it instead of restarting from zero. */
  onRowActivate(track: SoundTrack, list?: SoundTrack[]): void {
    if (!this.isPlayable(track)) return; // "Coming soon"
    if (this.isCurrentTrack(track)) {
      this.playerService.togglePlayPause();
      return;
    }
    this.playSound(track, list);
  }

  onSeek(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.playerService.seek(Math.min(100, Math.max(0, percent)));
  }

  onSeekKeydown(event: KeyboardEvent): void {
    const total = this.playerService.totalSeconds();
    if (total <= 0 || this.playerService.unavailable()) return;
    const elapsed = this.playerService.elapsed();
    let target: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        target = elapsed + SEEK_KEY_STEP_SECONDS;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        target = elapsed - SEEK_KEY_STEP_SECONDS;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = total;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.playerService.seek((Math.min(total, Math.max(0, target)) / total) * 100);
  }

  seekValueText(): string {
    return `${this.playerService.elapsedFormatted()} of ${this.playerService.remainingFormatted()} remaining`;
  }
}
