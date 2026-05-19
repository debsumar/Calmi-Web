import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '@/shared/components/cards/card.component';

@Component({
  selector: 'app-about',
  imports: [LucideAngularModule, CardComponent],
  templateUrl: './about.component.html',
  styles: [`
    @keyframes fadeInUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }
  `]
})
export class AboutComponent {
  values = [
    {
      icon: 'wind',
      title: 'Tranquility',
      description: 'We believe peace of mind is not a luxury, but a fundamental human need. Our spaces are designed to quiet the noise.'
    },
    {
      icon: 'heart',
      title: 'Empathy',
      description: 'Every sound and session is crafted with deep understanding of the daily stresses we all face.'
    },
    {
      icon: 'sparkles',
      title: 'Simplicity',
      description: 'We strip away the complex, leaving only what genuinely helps you reconnect with yourself.'
    }
  ];
}
