import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { CardComponent } from '@/shared/components/cards/card.component';
import { SoundCardComponent } from '@/shared/components/cards/sound-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

interface MoodCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [LucideAngularModule, PrimaryButtonComponent, CardComponent, RouterLink, SoundCardComponent, AnimateOnScrollDirective],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  moodCards = signal<MoodCard[]>([
    { icon: 'frown', title: 'I feel anxious', description: 'Calm your body and mind.' },
    { icon: 'brain', title: "I can't stop overthinking", description: 'Clear your thoughts.' },
    { icon: 'moon', title: "I can't sleep", description: 'Relax and fall asleep faster.' },
  ]);
}
