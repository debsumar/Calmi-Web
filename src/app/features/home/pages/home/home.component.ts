import { Component, signal } from '@angular/core';

interface MoodCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
})
export class HomeComponent {
  moodCards = signal<MoodCard[]>([
    { icon: '😰', title: 'I feel anxious', description: 'Calm your body and mind.' },
    { icon: '🧠', title: "I can't stop overthinking", description: 'Clear your thoughts.' },
    { icon: '🌙', title: "I can't sleep", description: 'Relax and fall asleep faster.' },
  ]);
}
