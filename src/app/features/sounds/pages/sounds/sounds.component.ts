import { Component, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';
import { SoundCardComponent } from '@/shared/components/cards/sound-card.component';

@Component({
  selector: 'app-sounds',
  imports: [LucideAngularModule, DragScrollDirective, SoundCardComponent],
  templateUrl: './sounds.component.html',
})
export class SoundsComponent {
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
    { title: 'Rain on Window', description: 'Gentle rain to calm your mind', duration: '45:00', image: 'assets/sound-images/rain-window.avif' },
    { title: 'Ocean Waves', description: 'Waves to relax and let go', duration: '60:00', image: 'assets/sound-images/ocean-waves.avif' },
    { title: 'Night Ambience', description: 'Feel the quiet of the night', duration: '55:00', image: 'assets/sound-images/night-ambience.avif' },
    { title: 'Bamboo Forest', description: 'Immersive birds and leaves rustling', duration: '1:00:00', image: 'assets/sound-images/bamboo-forest.avif' },
    { title: 'Heavy Rain', description: 'Deep rain to drown out noise', duration: '40:00', image: 'assets/sound-images/heavy-rain.avif' },
    { title: 'Fireplace', description: 'Crackling fire for cozy evenings', duration: '50:00', image: 'assets/sound-images/fireplace.avif' },
    { title: 'Calming Ocean', description: 'Peaceful ocean for deep focus', duration: '1:00:00', image: 'assets/sound-images/caliming-ocean.avif' },
    { title: 'Deep Forest', description: 'Dense forest with ambient wildlife', duration: '45:00', image: 'assets/sound-images/forest.avif' },
    { title: 'Steady Rain', description: 'Consistent rain for sleep', duration: '30:00', image: 'assets/sound-images/rain.avif' },
  ]);

  allSounds = signal([
    { title: 'Night Ambience', category: 'Ambient', categoryColor: 'bg-purple-600/30 text-purple-300', description: 'Crickets, breeze and calm night', duration: '60:00', image: 'assets/sound-images/night-ambience.avif' },
    { title: 'Heavy Rain', category: 'Rain', categoryColor: 'bg-purple-600/30 text-purple-300', description: 'Deep rain for deep sleep', duration: '45:00', image: 'assets/sound-images/heavy-rain.avif' },
    { title: 'Calming Ocean', category: 'Ocean', categoryColor: 'bg-purple-600/30 text-purple-300', description: 'Gentle waves and horizon', duration: '30:00', image: 'assets/sound-images/ocean-waves.avif' },
    { title: 'Cozy Fireplace', category: 'Nature', categoryColor: 'bg-purple-600/30 text-purple-300', description: 'Crackling fire to relax', duration: '15:00', image: 'assets/sound-images/fireplace.avif' },
  ]);
}
