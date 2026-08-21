import { describe, expect, it } from 'vitest';
import { ProfileDashboardService } from './profile-dashboard.service';

describe('ProfileDashboardService', () => {
  it('exposes source-labelled preview groups through a typed signal', () => {
    const dashboard = new ProfileDashboardService().dashboard();
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
    expect(dashboard.security.some((item) => item.action?.route === '/auth/forgot')).toBe(true);
  });

  it('summarises sleep-sound listening without claiming sleep measurement', () => {
    const audio = new ProfileDashboardService().dashboard().audio;
    expect(audio.tracks.length).toBeGreaterThan(0);
    expect(audio.totalMinutes).toBeGreaterThan(0);
    audio.tracks.forEach((track) => {
      expect(track.title.length).toBeGreaterThan(0);
      expect(track.minutes).toBeGreaterThanOrEqual(0);
      expect(track.plays).toBeGreaterThanOrEqual(0);
    });
  });

  it('uses neutral account-closure wording, not danger-zone framing', () => {
    const serialized = JSON.stringify(new ProfileDashboardService().dashboard());
    expect(serialized).not.toMatch(/danger zone/i);
    expect(new ProfileDashboardService().dashboard().accountClosure.label).toBe('Close your account');
  });

  it('does not provide a credential value or secret-shaped fixture', () => {
    const serialized = JSON.stringify(new ProfileDashboardService().dashboard());
    expect(serialized).not.toMatch(/developer key|secret|token|password_value/i);
  });
});
