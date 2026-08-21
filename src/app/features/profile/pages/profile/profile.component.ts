import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  LucideArrowRight,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideLock,
  LucideMoon,
  LucideShieldCheck,
} from '@lucide/angular';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { THERAPISTS, type AvailabilityState } from '@/features/therapy/data/therapist.data';
import { ProfileDashboardService } from '../../services/profile-dashboard.service';

type SessionDayState = AvailabilityState | 'past';

interface SessionDay {
  readonly key: string;
  readonly day: number;
  readonly label: string;
  readonly state: SessionDayState;
}

@Component({
  selector: 'app-profile',
  imports: [
    LucideArrowRight,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideLock,
    LucideMoon,
    LucideShieldCheck,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(ProfileDashboardService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly dashboard = this.dashboardService.dashboard;
  readonly user = this.authService.currentUser;
  readonly closureRequested = signal(false);
  readonly closureConfirmation = signal('');
  readonly closureStatus = signal('');
  readonly avatarFailed = signal(false);

  readonly displayName = computed(() => {
    const metadata = this.user()?.user_metadata as Record<string, unknown> | undefined;
    const fullName = metadata?.['full_name'];
    return typeof fullName === 'string' && fullName.trim() ? fullName.trim() : 'Calmi member';
  });

  readonly email = computed(() => this.user()?.email ?? 'Email unavailable');

  /** Google/Apple avatar from the signed-in identity. Only https URLs are accepted. */
  readonly avatarUrl = computed(() => {
    const metadata = this.user()?.user_metadata as Record<string, unknown> | undefined;
    const raw = metadata?.['avatar_url'] ?? metadata?.['picture'];
    if (typeof raw !== 'string' || !raw.trim()) return null;

    try {
      const parsed = new URL(raw.trim());
      return parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  });

  readonly showAvatarImage = computed(() => this.avatarUrl() !== null && !this.avatarFailed());

  readonly initials = computed(() => {
    const words = this.displayName().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CM';
  });

  readonly quotas = computed(() => this.dashboard().quotas.map((quota) => ({
    ...quota,
    percentage: this.meterPercentage(quota.used, quota.limit),
    valueText: `${quota.used} of ${quota.limit} ${quota.unit} used`,
  })));

  /** Radius 42 ring in a 96x96 viewBox: 2 * PI * 42. */
  readonly ringCircumference = Math.round(2 * Math.PI * 42 * 100) / 100;

  /** Chat allowance is the featured metric, shown as a circular progress ring. */
  readonly chatQuota = computed(() => {
    const quota = this.quotas().find((item) => item.id === 'support-messages');
    if (!quota) return null;

    const nearLimit = quota.percentage >= 85;
    return {
      ...quota,
      nearLimit,
      remaining: Math.max(0, quota.limit - quota.used),
      ringOffset: Math.round(this.ringCircumference * (1 - quota.percentage / 100) * 100) / 100,
    };
  });

  readonly supportingQuotas = computed(() => this.quotas().filter((quota) => quota.id !== 'support-messages'));

  /** Listening shares are relative to the most played track, for bar width only. */
  readonly audioTracks = computed(() => {
    const tracks = this.dashboard().audio.tracks;
    const busiest = tracks.reduce((max, track) => Math.max(max, track.minutes), 0);
    return tracks.map((track) => ({
      ...track,
      share: busiest > 0 ? Math.round((track.minutes / busiest) * 100) : 0,
    }));
  });

  /** Sign-in method taken from the authenticated identity, not from preview data. */
  readonly signInProvider = computed(() => {
    switch (this.user()?.app_metadata?.['provider']) {
      case 'google':
        return { label: 'Google', logo: '/assets/logos/google.svg', connected: true };
      case 'apple':
        return { label: 'Apple', logo: '/assets/logos/apple.svg', connected: true };
      case 'email':
        return { label: 'Email and password', logo: null, connected: true };
      default:
        return { label: 'Not identified', logo: null, connected: false };
    }
  });

  readonly closureIsValid = computed(() => this.closureConfirmation().trim().toUpperCase() === 'CLOSE');

  /**
   * Session availability comes from the same dataset the therapist profile
   * calendar renders, so both screens agree on which days are open.
   */
  private readonly availability = THERAPISTS[0]?.availability ?? [];
  readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  readonly sessionMonthLabel: string;
  readonly sessionWeeks: readonly (readonly (SessionDay | null)[])[];
  readonly openSessionDays: number;

  constructor() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const year = today.getFullYear();
    const month = today.getMonth();
    const availabilityByKey = new Map(this.availability.map((day) => [day.date, day.state]));

    this.sessionMonthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (SessionDay | null)[] = Array.from({ length: new Date(year, month, 1).getDay() }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const state: SessionDayState = date < today ? 'past' : (availabilityByKey.get(key) ?? 'unavailable');
      cells.push({
        key,
        day,
        state,
        label: `${date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, ${state}`,
      });
    }

    while (cells.length % 7 !== 0) cells.push(null);

    this.sessionWeeks = Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
    this.openSessionDays = cells.filter((cell) => cell?.state === 'available').length;
  }

  onAvatarError(): void {
    this.avatarFailed.set(true);
  }

  updateClosureConfirmation(value: string): void {
    this.closureConfirmation.set(value);
    if (this.closureStatus()) this.closureStatus.set('');
  }

  startClosure(): void {
    this.closureRequested.set(true);
    queueMicrotask(() => (this.host.nativeElement.querySelector('#closure-confirmation') as HTMLInputElement | null)?.focus());
  }

  cancelClosure(): void {
    this.closureRequested.set(false);
    this.closureConfirmation.set('');
    this.closureStatus.set('');
  }

  confirmClosure(): void {
    if (!this.closureIsValid()) {
      this.closureStatus.set('Type CLOSE exactly to continue.');
      queueMicrotask(() => (this.host.nativeElement.querySelector('#closure-confirmation') as HTMLInputElement | null)?.focus());
      return;
    }

    // TODO(backend): Submit the confirmed account closure request through a backend action.
    this.closureStatus.set('Account closure is unavailable until the account service is connected.');
  }

  private meterPercentage(used: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
  }
}
