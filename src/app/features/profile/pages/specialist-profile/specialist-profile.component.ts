import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideArrowUp,
  LucideBadgeCheck,
  LucideCalendarDays,
  LucideChartColumn,
  LucideChartLine,
  LucideChevronRight,
  LucideCircleCheck,
  LucideClipboardList,
  LucideClock,
  LucideDownload,
  LucideEllipsisVertical,
  LucideFileText,
  LucideHeartHandshake,
  LucideIndianRupee,
  LucideLandmark,
  LucideMessageSquare,
  LucideSettings,
  LucideShieldCheck,
  LucideUser,
  LucideUsers,
  LucideVideo,
  LucideX,
} from '@lucide/angular';
import { AuthService } from '@/core/services/auth.service';
import { resolveHttpsAvatarUrl } from '@/core/identity/avatar-url';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { DrawOnScrollDirective } from '@/shared/directives/draw-on-scroll.directive';
import {
  CLIENT_MESSAGES,
  EARNINGS,
  INSIGHTS,
  NEXT_SESSION,
  PRACTICE_STATS,
  PROFESSIONAL_INFO,
  SECURITY_ROWS,
  SESSIONS_TODAY,
  SHARED_REPORTS,
  SPECIALIST_HEADER,
  TODAY_SESSIONS,
  WEEKLY_SESSIONS,
} from './specialist-dashboard.data';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 170;
const CHART_LEFT = 36;
const CHART_RIGHT = 304;
const CHART_TOP = 12;
const CHART_BOTTOM = 132;
const CHART_MAX = 14;
const CHART_TICKS = [0, 4, 8, 12];
const DONUT_RADIUS = 40;

const inrFormatter = new Intl.NumberFormat('en-IN');

function formatInr(amount: number): string {
  return `₹${inrFormatter.format(amount)}`;
}

function chartY(value: number): number {
  return CHART_BOTTOM - (value / CHART_MAX) * (CHART_BOTTOM - CHART_TOP);
}

@Component({
  selector: 'app-specialist-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    LucideArrowRight,
    LucideArrowUp,
    LucideBadgeCheck,
    LucideCalendarDays,
    LucideChartColumn,
    LucideChartLine,
    LucideChevronRight,
    LucideCircleCheck,
    LucideClipboardList,
    LucideClock,
    LucideDownload,
    LucideEllipsisVertical,
    LucideFileText,
    LucideHeartHandshake,
    LucideIndianRupee,
    LucideLandmark,
    LucideMessageSquare,
    LucideSettings,
    LucideShieldCheck,
    LucideUser,
    LucideUsers,
    LucideVideo,
    LucideX,
    AnimateOnScrollDirective,
    DrawOnScrollDirective,
  ],
  templateUrl: './specialist-profile.component.html',
  styles: `
    /* Draw-in for the data graphics. Each holds an empty state only while the
       DrawOnScroll directive is waiting, then sweeps to the value the markup
       already carries. stroke-dashoffset, transform and opacity never trigger
       layout. Without the directive, with reduced motion, or with JavaScript
       disabled, the graphic renders at its value immediately. */
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

    /* pathLength="1" normalises the length, so one keyframe fits the line. */
    .draw-idle.spark-line {
      stroke-dashoffset: 1;
    }
    .draw-run.spark-line {
      animation: sparkDraw 2.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes sparkDraw {
      from { stroke-dashoffset: 1; }
      to { stroke-dashoffset: 0; }
    }

    /* Dots surface one after another, trailing the line as it reaches them. */
    .chart-dot {
      transform-box: fill-box;
      transform-origin: center;
    }
    .draw-idle.chart-dot {
      opacity: 0;
      transform: scale(0);
    }
    .draw-run.chart-dot {
      animation: dotIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: calc(0.35s + var(--index, 0) * 0.5s);
    }
    @keyframes dotIn {
      from { opacity: 0; transform: scale(0); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      /* Never animate, and never hold an empty state. */
      .ring-arc,
      .spark-line,
      .chart-dot {
        animation: none;
      }
      .ring-arc {
        stroke-dashoffset: var(--ring-offset);
      }
      .spark-line {
        stroke-dashoffset: 0;
      }
      .chart-dot {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class SpecialistProfileComponent {
  private readonly authService = inject(AuthService);

  readonly header = SPECIALIST_HEADER;
  readonly avatarFailed = signal(false);

  /** The expert's own Google sign-in image. Only https URLs are accepted. */
  readonly avatarUrl = computed(() =>
    resolveHttpsAvatarUrl(this.authService.currentUser()?.user_metadata as Record<string, unknown> | undefined),
  );

  readonly showAvatarImage = computed(() => this.avatarUrl() !== null && !this.avatarFailed());

  /** The expert's Google sign-in name, read the same way as the member profile; mock name only as fallback. */
  readonly displayName = computed(() => {
    const user = this.authService.currentUser();
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

    return SPECIALIST_HEADER.name;
  });

  /** Name and email rows track the signed-in expert; the rest stays dummy data for now. */
  readonly professionalInfo = computed(() => {
    const email = this.authService.currentUser()?.email;
    return PROFESSIONAL_INFO.map((row) => {
      if (row.label === 'Name') return { ...row, value: this.displayName() };
      if (row.label === 'Email' && email) return { ...row, value: email };
      return row;
    });
  });
  readonly nextSession = NEXT_SESSION;
  readonly sessionsToday = SESSIONS_TODAY;
  readonly earnings = EARNINGS;
  readonly insights = INSIGHTS;
  readonly sessions = TODAY_SESSIONS;
  readonly practiceStats = PRACTICE_STATS;
  readonly messages = CLIENT_MESSAGES;
  readonly reports = SHARED_REPORTS;
  readonly securityRows = SECURITY_ROWS;

  readonly todayEarnings = formatInr(EARNINGS.today);
  readonly monthEarnings = formatInr(EARNINGS.month);
  readonly totalEarnings = formatInr(EARNINGS.total);

  readonly donutRadius = DONUT_RADIUS;
  readonly donutCircumference = 2 * Math.PI * DONUT_RADIUS;
  readonly donutLabel = `${SESSIONS_TODAY.completed} of ${SESSIONS_TODAY.total} sessions completed`;
  /** Arc length left undrawn: the ring is dashed once at full circumference and offset to the value. */
  readonly donutOffset =
    Math.round(this.donutCircumference * (1 - SESSIONS_TODAY.completed / SESSIONS_TODAY.total) * 100) / 100;

  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;
  readonly chartLeft = CHART_LEFT;
  readonly chartRight = CHART_RIGHT;
  readonly chartGrid = CHART_TICKS.map((tick) => ({ label: String(tick), y: chartY(tick) }));
  readonly chartPoints = WEEKLY_SESSIONS.map((point, index) => ({
    label: point.label,
    value: point.value,
    x: CHART_LEFT + index * ((CHART_RIGHT - CHART_LEFT) / (WEEKLY_SESSIONS.length - 1)),
    y: chartY(point.value),
  }));
  readonly chartPath = this.chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
  readonly chartLabel = `Line chart of sessions over the last 4 weeks: ${this.chartPoints
    .map((point) => `${point.label} ${point.value}`)
    .join(', ')}`;

  onAvatarError(): void {
    this.avatarFailed.set(true);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
}
