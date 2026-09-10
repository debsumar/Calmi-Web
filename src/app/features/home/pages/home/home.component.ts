import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { CardComponent } from '@/shared/components/cards/card.component';
import { SoundCardComponent } from '@/shared/components/cards/sound-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { WaitlistCardComponent } from '@/shared/components/waitlist-card/waitlist-card.component';
import { PlayerService } from '@/core/services/player.service';
import { AuthService } from '@/core/services/auth.service';

interface NeedCard {
  icon: string;
  title: string;
  description: string;
  /** Destination route, or `null` while the feature is not shipped yet. */
  route: string | null;
}

@Component({
  selector: 'app-home',
  imports: [LucideDynamicIcon, PrimaryButtonComponent, CardComponent, RouterLink, SoundCardComponent, AnimateOnScrollDirective, WaitlistCardComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './home.component.html',
})
export class HomeComponent {
  playerService = inject(PlayerService);
  authService = inject(AuthService);
  needCards = signal<NeedCard[]>([
    { icon: 'notebook-pen', title: 'Write it out', description: 'Journal your thoughts.', route: '/journal' },
    { icon: 'message-circle-heart', title: 'Talk it through', description: 'Talk with Rumi AI.', route: '/rumi-ai' },
    { icon: 'moon-star', title: 'Sleep better', description: 'Relax and fall asleep faster.', route: '/sleep' },
    { icon: 'stethoscope', title: 'Get support', description: 'Connect with an expert.', route: '/therapy' },
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
