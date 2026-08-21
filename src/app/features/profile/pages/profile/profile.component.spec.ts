// @vitest-environment jsdom
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideLucideIcons,
  LucideArrowRight,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideLock,
  LucideMoon,
  LucideUser,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { ProfileDashboardService, type ProfileDashboardSnapshot } from '../../services/profile-dashboard.service';
import { ProfileComponent } from './profile.component';

const authStub = {
  currentUser: () => ({
    email: 'person@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: {
      full_name: 'Sam Calmi',
      avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg',
    },
  }),
};

const icons = () => provideLucideIcons(LucideArrowRight, LucideCircleAlert, LucideCircleCheck, LucideLock, LucideMoon, LucideUser);

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [ProfileDashboardService, { provide: AuthService, useValue: authStub }, icons(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
  });

  it('renders one ordered page heading and source labels for each preview group', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    // Bento tiles: Rumi AI usage, sleep sounds, guided sessions, 3 small wins, personal, security, closure.
    expect(root.querySelectorAll('h2')).toHaveLength(9);
    expect(root.textContent).toContain('Sam Calmi');
    expect(root.textContent).toContain('My space');
    expect(root.textContent).toContain('Calmi Student Premium');
    expect(root.textContent).not.toContain('Signed in with');
    // Preview/backend notices are intentionally not surfaced in the UI.
    expect(root.textContent).not.toContain('Preview data');
    expect(root.textContent).not.toMatch(/backend connection pending/i);
  });

  it('shows the plan in the header, not in the Rumi AI tile', () => {
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('header');
    expect(header?.textContent).toContain('Calmi Student Premium');
    expect(root.querySelector('[aria-labelledby="chat-usage-title"]')?.textContent).not.toContain('Student Premium');

    const upgrade = header?.querySelector<HTMLAnchorElement>('a');
    expect(upgrade?.textContent?.trim()).toBe('Upgrade plan');
    expect(upgrade?.getAttribute('href')).toBe('/pricing');
  });

  it('features Rumi AI usage with a circular ring and a text near-limit warning', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="chat-usage-title"]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('Rumi AI usage this month');
    expect(tile?.textContent).toContain('93%');
    expect(tile?.textContent).toContain('Approaching limit');

    // The ring is decorative; the same value is exposed through the meter.
    expect(tile?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    const arc = tile?.querySelectorAll('circle')[1];
    expect(arc?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(Number(arc?.getAttribute('stroke-dashoffset'))).toBeGreaterThan(0);
    expect(arc?.classList.contains('stroke-accent-coral')).toBe(true);

    const meter = tile?.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuenow')).toBe('28');
    expect(meter?.getAttribute('aria-valuemax')).toBe('30');
    expect(meter?.getAttribute('aria-valuetext')).toBe('28 of 30 conversations used');
  });

  it('summarises sleep-sound listening with values available as text', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="audio-title"]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('Sleep sounds');
    expect(tile?.textContent).toContain('412');
    expect(tile?.textContent).toContain('Rain on a tent');
    expect(tile?.textContent).toContain('24 plays');
    // Share bars are decorative; the minutes and plays are already written out.
    tile?.querySelectorAll('.bg-sunken-alt').forEach((bar) => {
      expect(bar.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('renders guided sessions as a stat card with an accessible meter', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="quota-therapy-sessions"]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('Guided sessions');
    expect(tile?.textContent).toContain('of 4');

    const meter = tile?.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuenow')).toBe('3');
    expect(meter?.getAttribute('aria-valuetext')).toBe('3 of 4 sessions used');
  });

  it('keeps the page header outside the bento grid', () => {
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.querySelector('h1')).not.toBeNull();
    expect(header?.closest('[class*="grid-flow-row-dense"]')).toBeNull();
  });

  it('drops the redundant plan tile and the combined other-usage card', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-labelledby="plan-title"]')).toBeNull();
    expect(root.querySelector('[aria-labelledby="usage-title"]')).toBeNull();
    expect(root.textContent).not.toMatch(/danger zone/i);
  });

  it('exposes every quota meter with a text equivalent', () => {
    const root = fixture.nativeElement as HTMLElement;
    const meters = root.querySelectorAll('[role="meter"]');
    expect(meters).toHaveLength(2);
    meters.forEach((meter) => {
      expect(meter.getAttribute('aria-label')).toBeTruthy();
      expect(meter.getAttribute('aria-valuemin')).toBe('0');
      expect(meter.getAttribute('aria-valuemax')).toBeTruthy();
      expect(meter.getAttribute('aria-valuenow')).toBeTruthy();
      expect(meter.getAttribute('aria-valuetext')).toBeTruthy();
    });
  });

  it('requires explicit CLOSE confirmation and reports unavailable backend state', () => {
    const root = fixture.nativeElement as HTMLElement;
    const startButton = Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start account closure'),
    );
    expect(startButton).toBeTruthy();
    startButton?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    const input = root.querySelector<HTMLInputElement>('#closure-confirmation');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-describedby')).toContain('closure-instructions');

    const continueButton = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Continue',
    );
    continueButton?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Type CLOSE exactly to continue.');

    input!.value = 'CLOSE';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    continueButton?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Account closure is unavailable until the account service is connected.');
  });

  it('shows the signed-in https avatar image and falls back to initials on error', () => {
    const root = fixture.nativeElement as HTMLElement;
    const image = root.querySelector<HTMLImageElement>('img');
    expect(image?.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/photo.jpg');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer');

    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('SC');
  });

  it('ignores a non-https avatar url and renders initials instead', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        ProfileDashboardService,
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              email: 'person@example.com',
              app_metadata: { provider: 'google' },
              // eslint-disable-next-line no-script-url
              user_metadata: { full_name: 'Sam Calmi', avatar_url: 'javascript:alert(1)' },
            }),
          },
        },
        icons(),
        provideRouter([]),
      ],
    }).compileComponents();

    const unsafeFixture = TestBed.createComponent(ProfileComponent);
    unsafeFixture.detectChanges();
    const root = unsafeFixture.nativeElement as HTMLElement;

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('SC');
  });

  it('renders empty preview groups without dereferencing records', async () => {
    const snapshot = new ProfileDashboardService().dashboard();
    const emptySnapshot: ProfileDashboardSnapshot = {
      ...snapshot,
      quotas: [],
      kpis: [],
      audio: { ...snapshot.audio, tracks: [], totalMinutes: 0, nightsWithAudio: 0 },
      preferences: [],
      security: [],
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: ProfileDashboardService, useValue: { dashboard: signal(emptySnapshot).asReadonly() } },
        { provide: AuthService, useValue: authStub },
        icons(),
        provideRouter([]),
      ],
    }).compileComponents();

    const emptyFixture = TestBed.createComponent(ProfileComponent);
    emptyFixture.detectChanges();
    const root = emptyFixture.nativeElement as HTMLElement;

    // Only the always-present tiles remain: sleep sounds, personal, security, closure.
    expect(root.querySelectorAll('h2')).toHaveLength(4);
    expect(root.querySelectorAll('[role="meter"]')).toHaveLength(0);
    expect(root.textContent).not.toMatch(/backend connection pending/i);
  });

  it('uses semantic token utilities and avoids forbidden view literals', () => {
    const template = fixture.nativeElement.innerHTML;
    expect(template).toContain('bg-canvas');
    expect(template).toContain('bg-surface');
    expect(template).toContain('focus-visible:ring-2');
    expect(template).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|hsl\(|dark:[^\s"']*\[/i);
    expect(template).not.toMatch(/text-\[[^]]+\]|font-(light|medium|bricolage)/i);
  });
});
