import { Component, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { CardComponent } from '@/shared/components/card/card.component';

interface MoodCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule, PrimaryButtonComponent, CardComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  moodCards = signal<MoodCard[]>([
    { icon: 'frown', title: 'I feel anxious', description: 'Calm your body and mind.' },
    { icon: 'brain', title: "I can't stop overthinking", description: 'Clear your thoughts.' },
    { icon: 'moon', title: "I can't sleep", description: 'Relax and fall asleep faster.' },
  ]);
}
