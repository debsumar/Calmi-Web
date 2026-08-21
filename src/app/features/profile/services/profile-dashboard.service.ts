import { Injectable, signal } from '@angular/core';

export interface PreviewSource {
  readonly kind: 'mock';
  readonly label: 'Preview data — backend connection pending';
}

export interface SubscriptionSummary {
  readonly name: string;
  readonly cadence: string;
  readonly renewal: string;
  readonly source: PreviewSource;
}

export interface QuotaRecord {
  readonly id: string;
  readonly label: string;
  readonly used: number;
  readonly limit: number;
  readonly unit: string;
  readonly renewal: string;
  readonly status: string;
  readonly source: PreviewSource;
}

export interface KpiRecord {
  readonly id: string;
  readonly value: string;
  readonly label: string;
  readonly description: string;
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

@Injectable({ providedIn: 'root' })
export class ProfileDashboardService {
  // TODO(backend): Replace preview snapshot with typed profile, quota, listening, and security API data.
  private readonly snapshot = signal<ProfileDashboardSnapshot>({
    subscription: {
      name: 'Student Premium',
      cadence: 'Monthly plan',
      renewal: 'Renews 01 Sep',
      source: PREVIEW_SOURCE,
    },
    quotas: [
      {
        id: 'support-messages',
        label: 'Rumi AI conversations',
        used: 28,
        limit: 30,
        unit: 'conversations',
        renewal: '2 conversations remain · renews 01 Sep',
        status: 'Approaching limit',
        source: PREVIEW_SOURCE,
      },
      {
        id: 'therapy-sessions',
        label: 'Guided sessions',
        used: 3,
        limit: 4,
        unit: 'sessions',
        renewal: '1 session available · renews 01 Sep',
        status: 'Steady',
        source: PREVIEW_SOURCE,
      },
    ],
    quotasSource: PREVIEW_SOURCE,
    kpis: [
      {
        id: 'check-ins',
        value: '12',
        label: 'Check-ins completed',
        description: 'Small steps count.',
        source: PREVIEW_SOURCE,
      },
      {
        id: 'calm-minutes',
        value: '118',
        label: 'Calm minutes',
        description: 'Time made for yourself.',
        source: PREVIEW_SOURCE,
      },
      {
        id: 'streak',
        value: '6 days',
        label: 'Current streak',
        description: 'No pressure to keep it.',
        source: PREVIEW_SOURCE,
      },
    ],
    kpisSource: PREVIEW_SOURCE,
    audio: {
      rangeLabel: 'Last 30 days',
      totalMinutes: 412,
      nightsWithAudio: 19,
      tracks: [
        { id: 'rain-on-tent', title: 'Rain on a tent', plays: 24, minutes: 168 },
        { id: 'ocean-drift', title: 'Ocean drift', plays: 16, minutes: 121 },
        { id: 'night-forest', title: 'Night forest', plays: 9, minutes: 74 },
        { id: 'low-hum', title: 'Low hum', plays: 6, minutes: 49 },
      ],
      source: PREVIEW_SOURCE,
    },
    preferences: [
      { id: 'timezone', label: 'Time zone', value: 'Asia/Kolkata', source: PREVIEW_SOURCE },
      { id: 'reminders', label: 'Reminders', value: 'A gentle nudge at 8:00 PM', source: PREVIEW_SOURCE },
      { id: 'language', label: 'Language', value: 'English', source: PREVIEW_SOURCE },
    ],
    preferencesSource: PREVIEW_SOURCE,
    security: [
      {
        id: 'password',
        label: 'Password',
        value: 'Last changed 12 Jun',
        status: 'Protected',
        action: { label: 'Change', route: '/auth/forgot' },
        source: PREVIEW_SOURCE,
      },
    ],
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
}
