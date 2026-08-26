import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { createTherapistFaqs } from '@/features/therapy/data/faq.data';
import { THERAPISTS } from '@/features/therapy/data/therapist.data';
import { FaqAccordionComponent } from '@/features/therapy/components/faq-accordion/faq-accordion.component';
import { TherapistProfileAboutComponent } from '@/features/therapy/components/therapist-profile-about/therapist-profile-about.component';
import { TherapistBookingSidebarComponent } from '@/features/therapy/components/therapist-booking-sidebar/therapist-booking-sidebar.component';
import { TherapistProfileEmptyStateComponent } from '@/features/therapy/components/therapist-profile-empty-state/therapist-profile-empty-state.component';
import { TherapistProfileHeroComponent } from '@/features/therapy/components/therapist-profile-hero/therapist-profile-hero.component';
import { TherapistTestimonialsComponent } from '@/features/therapy/components/therapist-testimonials/therapist-testimonials.component';
import { TherapistWhyChooseUsComponent } from '@/features/therapy/components/therapist-why-choose-us/therapist-why-choose-us.component';

@Component({
  selector: 'app-therapist-profile',
  imports: [
    TherapistProfileHeroComponent,
    FaqAccordionComponent,
    TherapistProfileAboutComponent,
    TherapistWhyChooseUsComponent,
    TherapistTestimonialsComponent,
    TherapistBookingSidebarComponent,
    TherapistProfileEmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './therapist-profile.component.html',
})
export class TherapistProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly therapist = computed(() => THERAPISTS.find((profile) => profile.id === this.routeParams().get('id')));
  readonly profileFaqs = computed(() => (this.therapist() ? createTherapistFaqs() : []));
}
