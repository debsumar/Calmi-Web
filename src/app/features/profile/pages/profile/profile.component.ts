import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import {
  LucideArrowRight,
  LucideCircleAlert,
  LucideTriangleAlert,
  LucideCircleCheck,
  LucideLock,
  LucideMinus,
  LucideMoon,
  LucideShieldCheck,
  LucideSparkles,
  LucideTrendingDown,
  LucideTrendingUp,
} from '@lucide/angular';
import { RouterLink } from '@angular/router';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { DrawOnScrollDirective } from '@/shared/directives/draw-on-scroll.directive';
import { AuthService } from '@/core/services/auth.service';
import { THERAPISTS, type TherapistSessionSlot } from '@/features/therapy/data/therapist.data';
import { ProfileDashboardService } from '../../services/profile-dashboard.service';

interface SessionDay {
  readonly key: string;
  readonly dayNumber: number;
  readonly weekday: string;
  readonly relativeLabel: string;
  readonly slots: readonly TherapistSessionSlot[];
}

@Component({
  selector: 'app-profile',
  imports: [
    NgClass,
    LucideArrowRight,
    LucideCircleAlert,
    LucideTriangleAlert,
    LucideCircleCheck,
    LucideLock,
    LucideMinus,
    LucideMoon,
    LucideShieldCheck,
    LucideSparkles,
    LucideTrendingDown,
    LucideTrendingUp,
    RouterLink,
    AnimateOnScrollDirective,
    DrawOnScrollDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styles: `
    /* Draw-in for the data graphics. Each holds an empty state only while the
       DrawOnScroll directive is waiting for the reader to scroll, then sweeps to
       the value the markup already carries. stroke-dashoffset repaints the path
       only; it never triggers layout. Without the directive, with reduced motion,
       or with JavaScript disabled, the graphic renders at its value immediately. */
    .draw-idle.ring-arc {
      stroke-dashoffset: var(--ring-full);
    }
    .draw-run.ring-arc {
      animation: ringSweep 2.2s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes ringSweep {
      from { stroke-dashoffset: var(--ring-full); }
      to { stroke-dashoffset: var(--ring-offset); }
    }

    .draw-idle.donut-arc {
      stroke-dashoffset: var(--seg-dash);
    }
    .draw-run.donut-arc {
      animation: donutSweep 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
      /* Segments follow one another so the composition builds up. */
      animation-delay: calc(var(--index, 0) * 260ms);
    }
    @keyframes donutSweep {
      from { stroke-dashoffset: var(--seg-dash); }
      to { stroke-dashoffset: 0; }
    }

    /* pathLength="1" normalises the length, so one keyframe fits every sparkline. */
    .draw-idle.spark-line {
      stroke-dashoffset: 1;
    }
    .draw-run.spark-line {
      animation: sparkDraw 3.2s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: calc(var(--index, 0) * 320ms);
    }
    @keyframes sparkDraw {
      from { stroke-dashoffset: 1; }
      to { stroke-dashoffset: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      /* Never animate, and never hold an empty state. */
      .ring-arc,
      .donut-arc,
      .spark-line {
        animation: none;
        stroke-dashoffset: revert-layer;
      }
    }
  `,
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

  /** Display name from the signed-in identity, falling back through provider fields. */
  readonly displayName = computed(() => {
    const user = this.user();
    const sources: Record<string, unknown>[] = [
      (user?.user_metadata ?? {}) as Record<string, unknown>,
      ...(user?.identities ?? []).map((identity) => (identity.identity_data ?? {}) as Record<string, unknown>),
    ];

    for (const source of sources) {
      const read = (key: string) => {
        const value = source[key];
        return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
      };
      const name =
        read('full_name') ||
        read('name') ||
        [read('given_name'), read('family_name')].filter(Boolean).join(' ') ||
        read('preferred_username');
      if (name) return name;
    }

    return 'Calmi member';
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

  readonly quotas = computed(() => this.dashboard().quotas.map((quota) => {
    const percentage = this.meterPercentage(quota.used, quota.limit);
    return {
      ...quota,
      percentage,
      valueText: `${quota.used} of ${quota.limit} ${quota.unit} used`,
      remaining: Math.max(0, quota.limit - quota.used),
    };
  }));

  /** Radius 42 ring in a 96x96 viewBox: 2 * PI * 42. Used by the listening donut. */
  readonly ringCircumference = Math.round(2 * Math.PI * 42 * 100) / 100;

  /** Chat allowance is the featured metric, shown as a circular progress ring. */
  readonly chatQuota = computed(() => {
    const quota = this.quotas().find((item) => item.id === 'support-messages');
    if (!quota) return null;

    const nearLimit = quota.percentage >= 85;
    return {
      ...quota,
      nearLimit,
      // Ring geometry and a scheme-aware arc colour, resolved once here.
      ringOffset: Math.round(this.ringCircumference * (1 - quota.percentage / 100) * 100) / 100,
      arcStroke: nearLimit ? 'stroke-accent-coral' : 'stroke-brand dark:stroke-brand-light',
    };
  });

  /** Guided-session allowance, now surfaced as text inside the sessions card. */
  readonly sessionsQuota = computed(() => this.quotas().find((item) => item.id === 'therapy-sessions') ?? null);

  /**
   * Donut of listening composition: each track's share of total minutes. Slices are
   * a sequential brand ramp and every slice is also written out in the key, so no
   * value depends on colour.
   */
  readonly audioDonut = computed(() => {
    const tracks = this.dashboard().audio.tracks;
    const total = tracks.reduce((sum, track) => sum + track.minutes, 0);
    const ramp = [
      { stroke: 'stroke-brand-deep dark:stroke-brand-light', swatch: 'bg-brand-deep' },
      { stroke: 'stroke-brand dark:stroke-brand-light', swatch: 'bg-brand' },
      { stroke: 'stroke-brand-soft dark:stroke-brand-light', swatch: 'bg-brand-soft' },
      { stroke: 'stroke-brand-light dark:stroke-brand-light', swatch: 'bg-brand-light' },
    ];

    let cumulative = 0;
    const segments = tracks.map((track, index) => {
      const share = total > 0 ? Math.round((track.minutes / total) * 100) : 0;
      const dash = Math.round(this.ringCircumference * (share / 100) * 100) / 100;
      const rotation = Math.round((-90 + cumulative * 3.6) * 100) / 100;
      cumulative += share;
      return {
        ...track,
        share,
        dash,
        gap: Math.round((this.ringCircumference - dash) * 100) / 100,
        rotation,
        ...ramp[index % ramp.length],
      };
    });

    return {
      total,
      segments,
      label: segments.map((segment) => `${segment.title} ${segment.share} percent`).join(', '),
    };
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

  /**
   * KPI signal strip: each metric keeps its exact value, a labelled delta, and a
   * sparkline path derived from its own plot points.
   */
  readonly signals = computed(() =>
    this.dashboard().kpis.map((kpi) => ({
      ...kpi,
      sparkPath: this.sparklinePath(kpi.trend),
      sparkLabel: `${kpi.label} trend across ${kpi.trendRangeLabel}, ${this.trendWording(kpi.trend)}`,
    })),
  );

  /**
   * Maps plot points into the 200x140 sparkline viewBox. Flat series render on the
   * mid-line rather than collapsing to the baseline.
   */
  private sparklinePath(points: readonly number[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M 4 72 L 196 72`;

    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = max - min;
    const step = 192 / (points.length - 1);

    return points
      .map((value, index) => {
        const x = Math.round((4 + index * step) * 100) / 100;
        const y = span === 0 ? 72 : Math.round((134 - ((value - min) / span) * 126) * 100) / 100;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  private trendWording(points: readonly number[]): string {
    if (points.length < 2) return 'no trend yet';
    const change = points[points.length - 1] - points[0];
    if (change > 0) return 'rising overall';
    if (change < 0) return 'easing overall';
    return 'holding steady';
  }

  readonly closureIsValid = computed(() => this.closureConfirmation().trim().toUpperCase() === 'CLOSE');

  /**
   * Session availability comes from the same dataset the therapist profile
   * calendar renders, so both screens agree on which days are open.
   */
  private readonly therapist = THERAPISTS[0];
  private readonly availability = this.therapist?.availability ?? [];
  readonly therapistId = this.therapist?.id ?? '';
  readonly therapistName = this.therapist?.name ?? '';
  readonly therapistSession: string;
  readonly sessionMonthLabel: string;
  readonly openSessionDays: number;
  /** Next few bookable days with their real times, newest first. */
  readonly nextSessionDays: readonly SessionDay[];
  readonly nextClosedDayLabel: string | null;

  constructor() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const month = today.getMonth();
    const year = today.getFullYear();

    this.sessionMonthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    this.therapistSession = this.therapist
      ? `${this.therapist.duration} · ${this.therapist.sessionMode}`
      : '';

    const upcoming = this.availability
      .map((day) => ({ day, date: this.parseDateKey(day.date) }))
      .filter((entry) => entry.date >= today);

    this.openSessionDays = this.availability.filter((day) => {
      const date = this.parseDateKey(day.date);
      return date >= today && date.getMonth() === month && date.getFullYear() === year && day.state === 'available';
    }).length;

    this.nextSessionDays = upcoming
      .filter((entry) => entry.day.state === 'available' && entry.day.slots.length > 0)
      .slice(0, 3)
      .map((entry) => ({
        key: entry.day.date,
        dayNumber: entry.date.getDate(),
        weekday: entry.date.toLocaleDateString(undefined, { weekday: 'short' }),
        relativeLabel: this.relativeDayLabel(entry.date, today),
        slots: entry.day.slots,
      }));

    const closed = upcoming.find((entry) => entry.day.state === 'unavailable');
    this.nextClosedDayLabel = closed
      ? closed.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
      : null;
  }

  private parseDateKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private relativeDayLabel(date: Date, today: Date): string {
    const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { weekday: 'long' });
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
