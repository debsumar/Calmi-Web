// @vitest-environment jsdom
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideLucideIcons,
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
  LucideUser,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { THERAPISTS } from '@/features/therapy/data/therapist.data';
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


const icons = () =>
  provideLucideIcons(
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
    LucideUser,
  );

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

  it('renders one ordered page heading and no preview notices', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    // Bento tiles: Rumi dial, sleep sounds, next sessions, KPI strip, personal, security, closure.
    expect(root.querySelectorAll('h2')).toHaveLength(7);
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

  it('features Rumi AI usage as a jumbo value with a bounded meter and upgrade link', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="chat-usage-title"]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('Rumi AI');
    // Heading is short; the icon carries the context. Full name stays in ARIA.
    expect(tile?.querySelector('h2')?.textContent?.trim()).toBe('Rumi AI');
    expect(tile?.querySelector('h2 svg')).not.toBeNull();
    expect(tile?.querySelector('h2 svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(tile?.textContent).toContain('/ 30');
    expect(tile?.textContent).toContain('93% used');
    expect(tile?.textContent).toContain('Approaching limit');
    // Warning is plain danger text, not a filled container.
    const warning = Array.from(tile!.querySelectorAll('p')).find((p) => p.textContent?.includes('Approaching limit'));
    expect(warning?.className).toContain('text-danger');
    expect(warning?.className).not.toMatch(/bg-(sunken|surface|elevated|danger)/);
    expect(tile?.textContent).not.toContain('no action is required');

    // The ring is the meter: one arc, no separate progress bar.
    const arcs = tile!.querySelectorAll('circle[stroke-dasharray]');
    expect(arcs).toHaveLength(1);
    expect(Number(arcs[0].getAttribute('stroke-dashoffset'))).toBeGreaterThan(0);
    expect(tile?.querySelectorAll('[role="meter"]')).toHaveLength(1);
    expect(tile?.querySelector('[role="meter"]')?.tagName.toLowerCase()).toBe('svg');

    const meter = tile?.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-label')).toBe('Rumi AI conversations used this month');
    expect(meter?.getAttribute('aria-valuenow')).toBe('28');
    expect(meter?.getAttribute('aria-valuemax')).toBe('30');
    expect(meter?.getAttribute('aria-valuetext')).toBe('28 of 30 conversations used');
    // Near the limit the arc switches to the coral accent.
    expect(arcs[0].getAttribute('class')).toBe('stroke-accent-coral');
    // The percentage inside the ring is decorative; the meter carries the value.
    expect(tile?.querySelector('svg + span')?.getAttribute('aria-hidden')).toBe('true');

    const upgrade = Array.from(tile!.querySelectorAll('a')).find((a) => a.textContent?.includes('Upgrade plan'));
    expect(upgrade?.getAttribute('href')).toBe('/pricing');
  });

  it('shows listening composition as a labelled donut with exact values in the key', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="audio-title"]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('Sleep sounds');
    // Caption sits on the heading row in the same quiet style as the KPI rail.
    expect(tile?.querySelector('h2')?.textContent?.trim()).toBe('Sleep sounds');
    const caption = Array.from(tile!.querySelectorAll('p')).find((p) => p.textContent?.includes('What you played most'));
    expect(caption?.className).toContain('text-xs');
    expect(caption?.textContent?.trim()).toBe('What you played most over the last 30 days.');
    expect(tile?.textContent).toContain('412');
    expect(tile?.textContent).toContain('19 nights');

    const donut = tile?.querySelector<SVGElement>('svg[role="img"]');
    expect(donut?.getAttribute('aria-label')).toContain('Share of listening minutes');
    expect(donut?.getAttribute('aria-label')).toContain('Rain on a tent 41 percent');

    // One track slice per record, plus the track background.
    const slices = donut!.querySelectorAll('circle');
    expect(slices).toHaveLength(5);
    expect(slices[1].getAttribute('stroke-dasharray')).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?$/);
    expect(slices[1].getAttribute('transform')).toBe('rotate(-90 48 48)');

    // Shares sum to the whole and each row states minutes and percentage as text.
    const rows = tile!.querySelectorAll('li');
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('Rain on a tent');
    expect(rows[0].textContent).toContain('168 min');
    expect(rows[0].textContent).toContain('41%');
    // Swatches are decorative.
    tile?.querySelectorAll('li span[aria-hidden="true"]').forEach((swatch) => {
      expect(swatch.className).toMatch(/bg-brand/);
    });
  });

  it('renders the KPI signal strip with exact values, deltas, and labelled sparklines', () => {
    const root = fixture.nativeElement as HTMLElement;
    const strip = root.querySelector<HTMLElement>('[aria-labelledby="signals-title"]');
    expect(strip).not.toBeNull();
    expect(strip?.textContent).toContain('This month');

    // The three trend KPIs share one rail; allowances live in their own dials.
    const cells = strip!.querySelectorAll('article');
    expect(cells).toHaveLength(3);

    expect(strip?.textContent).toContain('Check-ins');
    expect(strip?.textContent).toContain('Calm minutes');
    expect(strip?.textContent).toContain('Gentle streak');
    expect(strip?.textContent).toContain('+3 vs July');
    expect(strip?.textContent).toContain('+22 vs July');
    expect(strip?.textContent).toContain('Your own pace');

    // Sparklines are plotted from the KPI trend points, not decorative filler.
    const sparks = strip!.querySelectorAll('svg[role="img"]');
    expect(sparks).toHaveLength(3);
    const firstPath = sparks[0].querySelectorAll('path')[1];
    const commands = firstPath.getAttribute('d')!.match(/[ML]/g) ?? [];
    expect(commands).toHaveLength(7);
    expect(firstPath.getAttribute('d')).toMatch(/^M 4 /);
    sparks.forEach((spark) => {
      expect(spark.getAttribute('aria-label')).toMatch(/trend across the last 7 weeks/);
    });
  });

  it('lists the next bookable days with real slot times from the therapist data', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="sessions-title"]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('Sessions');
    expect(tile?.textContent).toContain(THERAPISTS[0].name);

    // Up to three upcoming open days, each with its own slot chips and Book action.
    const days = tile!.querySelectorAll('li');
    expect(days.length).toBeGreaterThan(0);
    expect(days.length).toBeLessThanOrEqual(3);

    const openDays = THERAPISTS[0].availability.filter((day) => day.state === 'available');
    expect(openDays.length).toBeGreaterThan(0);
    // Slot labels come from the dataset, not from hardcoded template text.
    expect(tile?.textContent).toContain(openDays[0].slots[1].label);

    const book = days[0].querySelector<HTMLAnchorElement>('a');
    expect(book?.getAttribute('href')).toBe(`/therapy/${THERAPISTS[0].id}`);
    expect(book?.getAttribute('aria-label')).toMatch(/^Book a session on /);

    // The guided-sessions dial is gone and the rail does not carry it either.
    expect(root.querySelector('[aria-labelledby="sessions-quota-title"]')).toBeNull();
    const strip = root.querySelector<HTMLElement>('[aria-labelledby="signals-title"]');
    expect(strip?.textContent).not.toContain('Guided sessions');
    // No month grid remains.
    expect(tile?.querySelector('table')).toBeNull();
  });

  it('shows the sign-in provider with a themed icon and the provider logo inline', () => {
    const root = fixture.nativeElement as HTMLElement;
    const tile = root.querySelector<HTMLElement>('[aria-labelledby="security-title"]');
    expect(tile?.textContent).toContain('Sign-in method');
    expect(tile?.textContent).toContain('Google');
    expect(tile?.textContent).toContain('Connected');

    const logo = tile?.querySelector<HTMLImageElement>('img');
    expect(logo?.getAttribute('src')).toBe('/assets/logos/google.svg');
    expect(logo?.getAttribute('alt')).toBe('');
    expect(logo?.getAttribute('aria-hidden')).toBe('true');

    const change = Array.from(tile!.querySelectorAll('a')).find((link) => link.textContent?.trim() === 'Change');
    expect(change?.getAttribute('href')).toBe('/auth/forgot');
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
    expect(meters).toHaveLength(1);
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
    const image = root.querySelector<HTMLImageElement>('header img');
    expect(image?.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/photo.jpg');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer');

    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.querySelector('header img')).toBeNull();
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

    expect(root.querySelector('header img')).toBeNull();
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

    // Always-present tiles: sleep sounds, KPI strip shell, sessions, personal, security, closure.
    expect(root.querySelectorAll('h2')).toHaveLength(6);
    expect(root.querySelectorAll('[role="meter"]')).toHaveLength(0);
    expect(root.querySelectorAll('svg[role="img"]')).toHaveLength(0);
    expect(root.textContent).not.toMatch(/backend connection pending/i);
  });

  it('locks responsive layout classes and hole-free bento spans at every state', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const bento = root.querySelector<HTMLElement>('[class*="grid-flow-row-dense"]');
    expect(bento?.className).toContain('md:grid-cols-2');
    expect(bento?.className).toContain('lg:grid-cols-6');

    const headerIdentity = root.querySelector('header > div');
    expect(headerIdentity?.className).toContain('min-w-0');
    expect(root.querySelector('h1')?.className).toContain('break-words');

    const audioLayout = root.querySelector<HTMLElement>('[aria-labelledby="audio-title"] > div.mt-5');
    expect(audioLayout?.className).toContain('flex-col');
    expect(audioLayout?.className).toContain('sm:flex-row');

    const sessions = root.querySelector<HTMLElement>('[aria-labelledby="sessions-title"]');
    expect(sessions?.querySelector('li')?.className).toContain('sm:flex-row');
    expect(sessions?.querySelector('a')?.className).toContain('w-full');

    const signals = root.querySelector<HTMLElement>('[aria-labelledby="signals-title"] > div.grid');
    expect(signals?.className).toContain('sm:grid-cols-3');
    expect(signals?.querySelector('svg[role="img"]')?.getAttribute('class')).toContain('aspect-[10/7]');

    const rumiValue = root.querySelector<HTMLElement>('[aria-labelledby="chat-usage-title"] span.text-4xl');
    expect(rumiValue?.className).toContain('md:text-5xl');

    const populatedTiles = Array.from(root.querySelectorAll<HTMLElement>('section[aria-labelledby]'));
    expect(populatedTiles).toHaveLength(7);
    expect(populatedTiles.every((tile) => tile.classList.contains('md:col-span-2'))).toBe(true);
    expect(populatedTiles.filter((tile) => tile.classList.contains('lg:col-span-3'))).toHaveLength(6);
    expect(populatedTiles.filter((tile) => tile.classList.contains('lg:col-span-6'))).toHaveLength(1);

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
    const emptyRoot = emptyFixture.nativeElement as HTMLElement;
    const emptyTiles = Array.from(emptyRoot.querySelectorAll<HTMLElement>('section[aria-labelledby]'));
    expect(emptyTiles).toHaveLength(6);
    expect(emptyTiles.every((tile) => tile.classList.contains('md:col-span-2'))).toBe(true);
    expect(emptyTiles.filter((tile) => tile.classList.contains('lg:col-span-3'))).toHaveLength(4);
    const emptySecurity = emptyRoot.querySelector<HTMLElement>('[aria-labelledby="security-title"]');
    expect(emptySecurity?.classList.contains('lg:col-span-6')).toBe(true);
    expect(emptySecurity?.classList.contains('lg:col-span-3')).toBe(false);
  });

  it('uses semantic token utilities and avoids forbidden view literals', () => {
    const template = fixture.nativeElement.innerHTML;
    expect(template).toContain('bg-canvas');
    expect(template).toContain('bg-surface');
    expect(template).toContain('focus-visible:ring-2');
    const forbiddenViewLiteralPattern = new RegExp(
      `#[0-9a-f]{3,8}|${'rgba'}\\(|hsl\\(|dark:[^\\s"']*\\[`,
      'i',
    );
    expect(template).not.toMatch(forbiddenViewLiteralPattern);
    expect(template).not.toMatch(/text-\[[^]]+\]|font-(light|medium|bricolage)/i);
  });
});
