import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { CardComponent } from '@/shared/components/cards/card.component';
import { SoundCardComponent } from '@/shared/components/cards/sound-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { WaitlistCardComponent } from '@/shared/components/waitlist-card/waitlist-card.component';
import { PlayerService } from '@/core/services/player.service';
import { AuthService } from '@/core/services/auth.service';

interface MoodCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [LucideDynamicIcon, PrimaryButtonComponent, CardComponent, RouterLink, SoundCardComponent, AnimateOnScrollDirective, WaitlistCardComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './home.component.html',
})
export class HomeComponent {
  playerService = inject(PlayerService);
  authService = inject(AuthService);
  moodCards = signal<MoodCard[]>([
    { icon: 'frown', title: 'I feel anxious', description: 'Calm your body and mind.' },
    { icon: 'brain', title: "I'm overthinking", description: 'Clear your thoughts.' },
    { icon: 'moon', title: "I can't sleep", description: 'Relax and fall asleep faster.' },
  ]);

  getUserFirstName(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    const fullName = user.user_metadata['full_name'] || '';
    if (fullName) {
      return fullName.split(' ')[0];
    }
    return user.email?.split('@')[0] || '';
  }
}
