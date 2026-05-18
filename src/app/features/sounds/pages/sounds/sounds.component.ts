import { Component, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sounds',
  standalone: true,
  imports: [LucideAngularModule],
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
    { title: 'Rain on Window', description: 'Gentle rain to calm your mind', duration: '45:00', bg: 'bg-[#4a6070]' },
    { title: 'Ocean Waves', description: 'Waves to relax and let go', duration: '60:00', bg: 'bg-[#1a3050]' },
    { title: 'Forest Ambience', description: 'Feel the quiet of the forest', duration: '55:00', bg: 'bg-[#2a4030]' },
  ]);
}
