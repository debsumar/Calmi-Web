import { Component, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';

@Component({
  selector: 'app-sounds',
  standalone: true,
  imports: [LucideAngularModule, DragScrollDirective],
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
    { title: 'Rain on Window', description: 'Gentle rain to calm your mind', duration: '45:00', image: 'rain' },
    { title: 'Ocean Waves', description: 'Waves to relax and let go', duration: '60:00', image: 'ocean-waves' },
    { title: 'Night Ambience', description: 'Feel the quiet of the night', duration: '55:00', image: 'night-ambience' },
    { title: 'Deep Forest', description: 'Immersive birds and leaves rustling', duration: '1:00:00', image: 'forest' },
    { title: 'Forest Stream', description: 'Calm water flowing through the woods', duration: '40:00', image: 'forest' },
    { title: 'Campfire in the Woods', description: 'Crackling fire under the forest canopy', duration: '50:00', image: 'forest' },
  ]);
}
