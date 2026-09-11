import { computed, inject, Injectable, signal } from '@angular/core';
import { JournalService } from '@/features/journal/services/journal.service';

export interface PreviewSource {
  readonly kind: 'mock';
  readonly label: 'Preview data — backend connection pending';
}

/** Marks a tile whose numbers are measured, not previewed. */
export interface DeviceSource {
  readonly kind: 'device';
  readonly label: 'Measured on this device';
}

/** Journal totals for the dashboard, derived from real entries on this device. */
export interface JournalSummary {
  readonly entries: number;
  readonly drafts: number;
  readonly words: number;
  readonly streakDays: number;
  readonly lastEntryAt: string | null;
  readonly source: DeviceSource;
}

export interface SubscriptionSummary {
  readonly name: string;
  readonly cadence: string;
  readonly renewal: string;
  readonly source: PreviewSource;
}

export interface QuotaRecord {
  readonly id: string;
  /** Full name, used for ARIA labels and value text. */
  readonly label: string;
  /** Short name for headings, where an icon already carries the context. */
  readonly shortLabel: string;
  readonly used: number;
  readonly limit: number;
  readonly unit: string;
  readonly renewal: string;
  readonly status: string;
  readonly source: PreviewSource;
}

/** Direction of a KPI compared with the person's own previous period. */
export type TrendDirection = 'up' | 'down' | 'flat';

export interface KpiRecord {
  readonly id: string;
  readonly value: string;
  /** Unit shown beside the value, e.g. "days". Empty when the label carries it. */
  readonly unit: string;
  readonly label: string;
  readonly description: string;
  /** Oldest-to-newest plot points for the sparkline. Same period spacing per KPI. */
  readonly trend: readonly number[];
  readonly trendRangeLabel: string;
  readonly comparison: { readonly label: string; readonly direction: TrendDirection };
  readonly source: PreviewSource;
}

/** One sleep-sound track in the listening summary. */
export interface AudioTrackRecord {
  readonly id: string;
  readonly title: string;
  readonly plays: number;
  readonly minutes: number;
}

/** Rolling summary of sleep-sound listening, not sleep measurement. */
export interface AudioSummary {
  readonly rangeLabel: string;
  readonly totalMinutes: number;
  readonly nightsWithAudio: number;
  readonly tracks: readonly AudioTrackRecord[];
  readonly source: PreviewSource;
}

export interface PreferenceRecord {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly source: PreviewSource;
}

export interface SecurityRecord {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly status: string;
  /** Optional in-app route for changing this setting. */
  readonly action?: { readonly label: string; readonly route: string };
  readonly source: PreviewSource;
}

export interface AccountClosureRecord {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly source: PreviewSource;
}

export interface ProfileDashboardSnapshot {
  readonly subscription: SubscriptionSummary;
  readonly quotas: readonly QuotaRecord[];
  readonly quotasSource: PreviewSource;
  readonly kpis: readonly KpiRecord[];
  readonly kpisSource: PreviewSource;
  readonly audio: AudioSummary;
  readonly preferences: readonly PreferenceRecord[];
  readonly preferencesSource: PreviewSource;
  readonly security: readonly SecurityRecord[];
  readonly securitySource: PreviewSource;
  readonly accountClosure: AccountClosureRecord;
}

const PREVIEW_SOURCE: PreviewSource = {
  kind: 'mock',
  label: 'Preview data — backend connection pending',
};

const DEVICE_SOURCE: DeviceSource = {
  kind: 'device',
  label: 'Measured on this device',
};

@Injectable({ providedIn: 'root' })
export class ProfileDashboardService {
  // TODO(backend): Replace preview snapshot with typed profile, quota, listening, and security API data.
  private readonly snapshot = signal<ProfileDashboardSnapshot>({
    subscription: {
      name: 'Free',
      cadence: 'Free forever',
      renewal: 'Allowances reset monthly',
      source: PREVIEW_SOURCE,
    },
    quotas: [
      {
        id: 'support-messages',
        label: 'Rumi AI conversations',
        shortLabel: 'Rumi AI',
        // Free tier: "Limited Rumi AI Conversations" per the pricing page.
        used: 0,
        limit: 10,
        unit: 'conversations',
        renewal: 'Resets monthly',
        status: 'Nothing used yet',
        source: PREVIEW_SOURCE,
      },
      {
        id: 'therapy-sessions',
        label: 'Guided sessions',
        shortLabel: 'Guided sessions',
        used: 0,
        limit: 1,
        unit: 'sessions',
        renewal: 'Resets monthly',
        status: 'Nothing used yet',
        source: PREVIEW_SOURCE,
      },
    ],
    quotasSource: PREVIEW_SOURCE,
    kpis: [
      {
        id: 'check-ins',
        value: '0',
        unit: 'days',
        label: 'Check-ins',
        description: 'Small steps count.',
        // TODO(backend): Replace with real weekly aggregates.
        trend: [],
        trendRangeLabel: 'this month',
        comparison: { label: 'No history yet', direction: 'flat' },
        source: PREVIEW_SOURCE,
      },
      {
        id: 'calm-minutes',
        value: '0',
        unit: 'min',
        label: 'Calm minutes',
        description: 'Time made for yourself.',
        trend: [],
        trendRangeLabel: 'this month',
        comparison: { label: 'No history yet', direction: 'flat' },
        source: PREVIEW_SOURCE,
      },
      {
        id: 'streak',
        value: '0',
        unit: 'days',
        label: 'Gentle streak',
        description: 'No pressure to keep it.',
        trend: [],
        trendRangeLabel: 'this month',
        comparison: { label: 'Your own pace', direction: 'flat' },
        source: PREVIEW_SOURCE,
      },
    ],
    kpisSource: PREVIEW_SOURCE,
    audio: {
      rangeLabel: 'last 30 days',
      totalMinutes: 0,
      nightsWithAudio: 0,
      tracks: [],
      source: PREVIEW_SOURCE,
    },
    preferences: [
      { id: 'timezone', label: 'Time zone', value: 'Asia/Kolkata', source: PREVIEW_SOURCE },
      { id: 'reminders', label: 'Reminders', value: 'A gentle nudge at 8:00 PM', source: PREVIEW_SOURCE },
      { id: 'language', label: 'Language', value: 'English', source: PREVIEW_SOURCE },
    ],
    preferencesSource: PREVIEW_SOURCE,
    security: [],
    securitySource: PREVIEW_SOURCE,
    accountClosure: {
      id: 'close-account',
      label: 'Close your account',
      description: 'Closing removes your profile, sessions, and listening history.',
      actionLabel: 'Start account closure',
      source: PREVIEW_SOURCE,
    },
  });

  readonly dashboard = this.snapshot.asReadonly();

  private readonly journalService = inject(JournalService);

  /**
   * Real journal figures, kept beside the preview snapshot rather than inside it:
   * these come from the device, so they must not carry the preview label.
   */
  readonly journal = computed<JournalSummary>(() => {
    const stats = this.journalService.stats();
    return {
      entries: stats.total,
      drafts: stats.drafts,
      words: stats.totalWords,
      streakDays: stats.streakDays,
      lastEntryAt: stats.lastEntryAt,
      source: DEVICE_SOURCE,
    };
  });
}
