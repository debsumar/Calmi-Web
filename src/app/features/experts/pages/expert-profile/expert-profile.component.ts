import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { createExpertFaqs } from '@/features/experts/data/faq.data';
import { EXPERTS } from '@/features/experts/data/expert.data';
import { FaqAccordionComponent } from '@/features/experts/components/faq-accordion/faq-accordion.component';
import { ExpertProfileAboutComponent } from '@/features/experts/components/expert-profile-about/expert-profile-about.component';
import { ExpertBookingSidebarComponent } from '@/features/experts/components/expert-booking-sidebar/expert-booking-sidebar.component';
import { ExpertProfileEmptyStateComponent } from '@/features/experts/components/expert-profile-empty-state/expert-profile-empty-state.component';
import { ExpertProfileHeroComponent } from '@/features/experts/components/expert-profile-hero/expert-profile-hero.component';
import { ExpertTestimonialsComponent } from '@/features/experts/components/expert-testimonials/expert-testimonials.component';
import { ExpertWhyChooseUsComponent } from '@/features/experts/components/expert-why-choose-us/expert-why-choose-us.component';

@Component({
  selector: 'app-expert-profile',
  imports: [
    ExpertProfileHeroComponent,
    FaqAccordionComponent,
    ExpertProfileAboutComponent,
    ExpertWhyChooseUsComponent,
    ExpertTestimonialsComponent,
    ExpertBookingSidebarComponent,
    ExpertProfileEmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expert-profile.component.html',
})
export class ExpertProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly expert = computed(() => EXPERTS.find((profile) => profile.id === this.routeParams().get('id')));
  readonly profileFaqs = computed(() => (this.expert() ? createExpertFaqs() : []));
}
