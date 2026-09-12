import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';
import { JournalService } from '@/features/journal/services/journal.service';
import { ProfileDashboardService } from './profile-dashboard.service';

function service(): ProfileDashboardService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideAuthServiceStub()] });
  return TestBed.inject(ProfileDashboardService);
}

describe('ProfileDashboardService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes source-labelled preview groups through a typed signal', () => {
    const dashboard = service().dashboard();
    const sourceLabels = [
      dashboard.subscription.source.label,
      dashboard.quotasSource.label,
      dashboard.kpisSource.label,
      dashboard.audio.source.label,
      dashboard.preferencesSource.label,
      dashboard.securitySource.label,
      dashboard.accountClosure.source.label,
    ];

    expect(sourceLabels.every((label) => label === 'Preview data — backend connection pending')).toBe(true);
    expect(
      dashboard.security.some((item) => item.action?.route === '/auth/forgot' || item.action?.route === '/auth/reset'),
    ).toBe(false);
  });

  it('summarises sleep-sound listening without claiming sleep measurement', () => {
    const audio = service().dashboard().audio;
    // Zeroed baseline until the backend supplies real playback figures.
    expect(audio.tracks).toHaveLength(0);
    expect(audio.totalMinutes).toBe(0);
    expect(audio.nightsWithAudio).toBe(0);
    expect(audio.rangeLabel).toBe('last 30 days');
  });

  it('starts every quota and KPI at zero', () => {
    const dashboard = service().dashboard();
    dashboard.quotas.forEach((quota) => {
      expect(quota.used).toBe(0);
      expect(quota.limit).toBeGreaterThan(0);
    });
    dashboard.kpis.forEach((kpi) => {
      expect(kpi.value).toBe('0');
      expect(kpi.trend).toHaveLength(0);
      expect(kpi.comparison.direction).toBe('flat');
    });
  });

  it('ships no booked sessions until the booking service is connected', () => {
    // The profile must not fabricate bookings from therapist availability data.
    expect(service().dashboard().sessions).toEqual([]);
  });

  it('uses neutral account-closure wording, not danger-zone framing', () => {
    const dashboard = service().dashboard();
    expect(JSON.stringify(dashboard)).not.toMatch(/danger zone/i);
    expect(dashboard.accountClosure.label).toBe('Close your account');
  });

  it('does not provide a credential value or secret-shaped fixture', () => {
    expect(JSON.stringify(service().dashboard())).not.toMatch(/developer key|secret|token|password_value/i);
  });

  it('reports an empty journal summary marked as device data, not preview data', () => {
    const journal = service().journal();

    expect(journal.entries).toBe(0);
    expect(journal.streakDays).toBe(0);
    expect(journal.lastEntryAt).toBeNull();
    expect(journal.source).toEqual({ kind: 'device', label: 'Measured on this device' });
  });

  it('reflects real journal entries in the summary', () => {
    const dashboard = service();
    const journalService = TestBed.inject(JournalService);
    journalService.upsert({ id: null, title: 'Today', content: 'three little words', status: 'saved' });
    const draft = journalService.upsert({ id: null, title: 'Draft', content: 'two words', status: 'draft' }).entry;

    const summary = dashboard.journal();
    expect(summary.entries).toBe(2);
    expect(summary.drafts).toBe(1);
    expect(summary.words).toBe(5);
    expect(summary.streakDays).toBe(1);
    expect(summary.lastEntryAt).toBe(draft.updatedAt);
  });
});
