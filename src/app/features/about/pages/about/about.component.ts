import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '@/shared/components/cards/card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

@Component({
  selector: 'app-about',
  imports: [LucideAngularModule, CardComponent, AnimateOnScrollDirective],
  templateUrl: './about.component.html',
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
