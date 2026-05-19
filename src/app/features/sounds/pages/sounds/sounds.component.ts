import { Component, signal, ViewChild, ElementRef, afterNextRender, HostListener, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';
import { SoundCardComponent } from '@/shared/components/cards/sound-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { PlayerService, SoundTrack } from '@/core/services/player.service';

@Component({
  selector: 'app-sounds',
  imports: [LucideAngularModule, DragScrollDirective, SoundCardComponent, AnimateOnScrollDirective],
  templateUrl: './sounds.component.html',
})
export class SoundsComponent {
  playerService = inject(PlayerService);
  @ViewChild('carousel', { static: false }) carouselRef?: ElementRef<HTMLElement>;

  showLeftShadow = signal(false);
  showRightShadow = signal(true);

  constructor() {
    afterNextRender(() => {
      this.checkShadows();
      setTimeout(() => this.checkShadows(), 100);
      setTimeout(() => this.checkShadows(), 300);
      setTimeout(() => this.checkShadows(), 600);
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
  }
  vibes = signal([
    { icon: 'waves', label: 'All Sounds', active: true },
    { icon: 'cloud-rain', label: 'Rain', active: false },
    { icon: 'waves', label: 'Ocean', active: false },
    { icon: 'tree-pine', label: 'Nature', active: false },
    { icon: 'sun', label: 'Ambient', active: false },
    { icon: 'audio-lines', label: 'White Noise', active: false },
    { icon: 'flame', label: 'Fireplace', active: false },
  ]);

  featuredSounds = signal([
    { title: 'Rain on Window', description: 'Gentle rain to calm your mind', duration: '45:00', image: 'assets/sound-images/rain-window.avif', audio: 'assets/sounds/rain.mp3' },
    { title: 'Ocean Waves', description: 'Waves to relax and let go', duration: '60:00', image: 'assets/sound-images/ocean-waves.avif' },
    { title: 'Night Ambience', description: 'Feel the quiet of the night', duration: '55:00', image: 'assets/sound-images/night-ambience.avif' },
    { title: 'Bamboo Forest', description: 'Immersive birds and leaves rustling', duration: '1:00:00', image: 'assets/sound-images/bamboo-forest.avif' },
    { title: 'Heavy Rain', description: 'Deep rain to drown out noise', duration: '40:00', image: 'assets/sound-images/heavy-rain.avif', audio: 'assets/sounds/rain.mp3' },
    { title: 'Fireplace', description: 'Crackling fire for cozy evenings', duration: '50:00', image: 'assets/sound-images/fireplace.avif' },
    { title: 'Calming Ocean', description: 'Peaceful ocean for deep focus', duration: '1:00:00', image: 'assets/sound-images/caliming-ocean.avif' },
    { title: 'Deep Forest', description: 'Dense forest with ambient wildlife', duration: '45:00', image: 'assets/sound-images/forest.avif' },
    { title: 'Steady Rain', description: 'Consistent rain for sleep', duration: '30:00', image: 'assets/sound-images/rain.avif' },
  ]);

  allSounds = signal([
    { title: 'Night Ambience', category: 'Ambient', categoryColor: 'bg-brand/15 text-brand-dark dark:bg-brand/20 dark:text-brand', description: 'Crickets, breeze and calm night', duration: '60:00', image: 'assets/sound-images/night-ambience.avif' },
    { title: 'Heavy Rain', category: 'Rain', categoryColor: 'bg-brand/15 text-brand-dark dark:bg-brand/20 dark:text-brand', description: 'Deep rain for deep sleep', duration: '45:00', image: 'assets/sound-images/heavy-rain.avif', audio: 'assets/sounds/rain.mp3' },
    { title: 'Calming Ocean', category: 'Ocean', categoryColor: 'bg-brand/15 text-brand-dark dark:bg-brand/20 dark:text-brand', description: 'Gentle waves and horizon', duration: '30:00', image: 'assets/sound-images/ocean-waves.avif' },
    { title: 'Cozy Fireplace', category: 'Nature', categoryColor: 'bg-brand/15 text-brand-dark dark:bg-brand/20 dark:text-brand', description: 'Crackling fire to relax', duration: '15:00', image: 'assets/sound-images/fireplace.avif' },
  ]);

  playSound(track: SoundTrack, list?: SoundTrack[]): void {
    this.playerService.play(track, list);
  }

  onSeek(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const percent = (event.offsetX / el.clientWidth) * 100;
    this.playerService.seek(percent);
  }
}
