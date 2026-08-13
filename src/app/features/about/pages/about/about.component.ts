import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

interface DriverValue {
  icon: string;
  title: string;
  description: string;
  featured: boolean;
}

@Component({
  selector: 'app-about',
  imports: [LucideDynamicIcon, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './about.component.html',
})
export class AboutComponent {
  readonly values = signal<DriverValue[]>([
    {
      icon: 'hand-heart',
      title: 'Human-Centered Care',
      description: 'We design every experience with empathy, making emotional support simple, accessible, and judgment-free.',
      featured: false,
    },
    {
      icon: 'stethoscope',
      title: 'Expert-Led Guidance',
      description: 'Our approach is inspired by psychological principles and built to complement professional mental health support.',
      featured: true,
    },
    {
      icon: 'sprout',
      title: 'Personalized Growth',
      description: 'No two journeys are the same. It adapts to your emotions, habits, and goals to provide support that feels relevant to you.',
      featured: false,
    },
  ]);
}
