// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { buildChart, buildDonut, SpecialistProfileComponent } from './specialist-profile.component';

const GOOGLE_AVATAR = 'https://lh3.googleusercontent.com/a/expert-photo.jpg';

function authStub(userMetadata: Record<string, unknown> | null, appMetadata: Record<string, unknown> = {}) {
  return {
    currentUser: () =>
      userMetadata
        ? { email: 'expert@example.com', user_metadata: userMetadata, app_metadata: appMetadata }
        : null,
  };
}

async function render(userMetadata: Record<string, unknown> | null, appMetadata: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SpecialistProfileComponent],
    providers: [{ provide: AuthService, useValue: authStub(userMetadata, appMetadata) }],
  }).compileComponents();
  const fixture = TestBed.createComponent(SpecialistProfileComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SpecialistProfileComponent', () => {
  let fixture: ComponentFixture<SpecialistProfileComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    fixture = await render({ avatar_url: GOOGLE_AVATAR }, { provider: 'google' });
    root = fixture.nativeElement as HTMLElement;
  });

  it('renders the fallback name as the page heading when the sign-in has no name, and no placeholder', () => {
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Calmi expert');
    expect(root.textContent).not.toContain('Coming soon');
  });

  it('never renders the old dummy expert name or email', () => {
    expect(root.textContent).not.toMatch(/garima/i);
    expect(root.innerHTML).not.toMatch(/garima/i);
  });

  it('uses the expert Google sign-in name and email for heading, alt, initials and info rows', async () => {
    const google = await render({ full_name: 'Asha Rao', avatar_url: GOOGLE_AVATAR });
    const el = google.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Asha Rao');
    expect(el.querySelector('img[referrerpolicy="no-referrer"]')?.getAttribute('alt')).toBe('Portrait of Asha Rao');
    expect(el.querySelector('dl')?.textContent).toContain('Asha Rao');
    expect(el.querySelector('dl')?.textContent).toContain('expert@example.com');
    expect(el.textContent).not.toMatch(/garima/i);

    const noPhoto = await render({ name: 'Asha Rao' });
    expect((noPhoto.nativeElement as HTMLElement).querySelector('[aria-hidden="true"].h-32')?.textContent?.trim()).toBe('AR');
  });

  it('renders every dashboard section heading', () => {
    const headings = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());

    expect(headings).toEqual([
      "Today's Clients",
      'Earnings',
      'Client insights shared',
      "Today's Sessions",
      'Practice Overview',
      'Client Message (Pre-session)',
      'Shared Reports',
      'Professional Information',
      'Account & Security',
    ]);
  });

  describe('empty baseline', () => {
    it('shows the next-session empty state and no Join Meet button', () => {
      expect(root.textContent).toContain('No upcoming sessions');
      expect(root.textContent).toContain('New bookings will appear here.');
      expect(root.textContent).not.toContain('Join Meet');
    });

    it('shows an empty donut with no NaN or Infinity anywhere', () => {
      const donut = root.querySelector('svg[role="img"][aria-label="No sessions today"]');
      expect(donut).not.toBeNull();
      expect(donut?.getAttribute('aria-label')).not.toContain('NaN');
      expect(donut?.querySelector('.ring-arc')).toBeNull();
      expect(donut?.parentElement?.textContent?.replace(/\s+/g, '')).toContain('0/0');

      expect(root.textContent).not.toMatch(/NaN|Infinity/);
      expect(root.innerHTML).not.toMatch(/NaN|Infinity/);
    });

    it('shows zero session stats', () => {
      const stats = Array.from(root.querySelectorAll('section[aria-labelledby="clients-title"] ul li')).map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(stats).toEqual(['0Upcoming', '0Rescheduled', '0Cancelled']);
    });

    it('shows zero earnings and no trend pill', () => {
      const earnings = root.querySelector('section[aria-labelledby="earnings-title"]')!.textContent!;
      expect(earnings.match(/₹0/g)).toHaveLength(3);
      expect(earnings).not.toContain('vs last week');
    });

    it('shows zero insights with all three categories', () => {
      const insights = root.querySelector('section[aria-labelledby="insights-title"]')!;
      expect(insights.textContent).toContain('reports shared this month');
      const rows = Array.from(insights.querySelectorAll('ul li')).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
      expect(rows).toEqual(['Mood insights0', 'Session summary0', 'Care recommendations0']);
    });

    it('shows empty states for sessions, chart, messages and reports', () => {
      expect(root.textContent).toContain('No sessions scheduled for today.');
      expect(root.textContent).toContain('Not enough sessions to chart yet.');
      expect(root.textContent).toContain('No messages from clients yet. Pre-session notes will show up here.');
      expect(root.textContent).toContain('No reports shared yet.');

      expect(root.querySelector('ul[aria-label="Today\'s sessions"]')).toBeNull();
      expect(root.querySelector('ul[aria-label="Shared reports"]')).toBeNull();
      expect(root.querySelector('button[aria-label^="Download "]')).toBeNull();
      expect(root.querySelector('svg[aria-label^="Line chart of sessions"]')).toBeNull();
      expect(root.querySelector('.spark-line')).toBeNull();
      expect(root.querySelector('.chart-dot')).toBeNull();
    });

    it('shows zeroed practice stats without a trend line', () => {
      const stats = Array.from(root.querySelectorAll('section[aria-labelledby="practice-title"] ul.grid > li')).map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(stats).toEqual([
        '0Sessions this month',
        '0%Completion rate',
        '0New clients',
        '0Returning clients',
      ]);
      expect(root.querySelector('section[aria-labelledby="practice-title"] .sr-only')).toBeNull();
    });

    it('renders empty-state blocks with the stagger directive', () => {
      const copy = [
        'No upcoming sessions',
        'No sessions scheduled for today.',
        'Not enough sessions to chart yet.',
        'No messages from clients yet. Pre-session notes will show up here.',
        'No reports shared yet.',
      ];
      for (const text of copy) {
        const node = Array.from(root.querySelectorAll<HTMLElement>('p')).find((p) => p.textContent?.trim() === text);
        expect(node, text).toBeDefined();
        expect(node?.hasAttribute('appAnimateOnScroll'), text).toBe(true);
      }
    });

    it('hides the title line and shows the specialties prompt without a "+0" chip', () => {
      const header = root.querySelector<HTMLElement>('[aria-labelledby="specialist-title"]')!;
      expect(header.textContent).toContain('Add your specialties');
      expect(header.textContent).not.toContain('+0');
      expect(header.textContent).not.toContain('Clinical Psychologist');
    });

    it('shows "Not added yet" for unset professional information rows', () => {
      const rows = Array.from(root.querySelectorAll('section[aria-labelledby="info-title"] dl > div')).map((row) => ({
        label: row.querySelector('dt')?.textContent?.trim(),
        value: row.querySelector('dd')?.textContent?.trim(),
      }));
      expect(rows).toEqual([
        { label: 'Name', value: 'Calmi expert' },
        { label: 'Email', value: 'expert@example.com' },
        { label: 'Experience', value: 'Not added yet' },
        { label: 'Languages', value: 'Not added yet' },
        { label: 'Consultation modes', value: 'Not added yet' },
        { label: 'Availability', value: 'Not added yet' },
      ]);
    });

    it('shows "Not added yet" for the email row when the sign-in has no email', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [SpecialistProfileComponent],
        providers: [
          { provide: AuthService, useValue: { currentUser: () => ({ user_metadata: {}, app_metadata: {} }) } },
        ],
      }).compileComponents();
      const noEmail = TestBed.createComponent(SpecialistProfileComponent);
      noEmail.detectChanges();
      const emailRow = Array.from(
        (noEmail.nativeElement as HTMLElement).querySelectorAll('section[aria-labelledby="info-title"] dl > div'),
      ).find((row) => row.querySelector('dt')?.textContent?.trim() === 'Email');
      expect(emailRow?.querySelector('dd')?.textContent?.trim()).toBe('Not added yet');
    });
  });

  describe('account & security', () => {
    const rowsOf = (host: HTMLElement) =>
      Array.from(host.querySelectorAll('section[aria-labelledby="security-title"] ul > li')).map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      );

    it('shows Google and Connected for a google sign-in, with the Google mark', () => {
      const [signIn] = rowsOf(root);
      expect(signIn).toContain('Google');
      expect(signIn).toContain('Connected');
      expect(root.querySelector('section[aria-labelledby="security-title"] svg[viewBox="0 0 48 48"]')).not.toBeNull();
    });

    it('does not show Connected or the Google mark for a non-google sign-in', async () => {
      const github = await render({ full_name: 'Asha Rao' }, { provider: 'github' });
      const host = github.nativeElement as HTMLElement;
      const [signIn] = rowsOf(host);
      expect(signIn).toContain('Github');
      expect(signIn).not.toContain('Google');
      expect(signIn).not.toContain('Connected');
      expect(host.querySelector('section[aria-labelledby="security-title"] svg[viewBox="0 0 48 48"]')).toBeNull();

      const email = await render({ full_name: 'Asha Rao' }, { provider: 'email' });
      const [emailRow] = rowsOf(email.nativeElement as HTMLElement);
      expect(emailRow).toContain('Email');
      expect(emailRow).not.toContain('Connected');
    });

    it('never claims payout details are verified', () => {
      const payout = rowsOf(root)[1];
      expect(payout).toContain('Payout details');
      expect(payout).toContain('Not added yet');
      expect(payout).not.toContain('Verified');
      expect(root.textContent).not.toContain('HDFC');
    });

    it('keeps account settings unchanged', () => {
      expect(rowsOf(root)[2]).toBe('Account settings Profile, notifications, availability');
    });
  });

  it('exposes an accessible donut label', () => {
    expect(root.querySelector('svg[role="img"][aria-label="No sessions today"]')).not.toBeNull();
  });

  it('applies capped stagger to every dashboard section', () => {
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section[aria-labelledby]'));

    expect(sections).toHaveLength(10);
    expect(sections.every((section) => section.hasAttribute('appAnimateOnScroll'))).toBe(true);
    expect(sections.every((section) => section.classList.contains('stagger-enter'))).toBe(true);
    expect(sections.map((section) => section.style.getPropertyValue('--index'))).toEqual([
      '0', '1', '2', '3', '4', '4', '5', '5', '5', '5',
    ]);
  });

  it('staggers header text, the specialties prompt and card headings with local indexes', () => {
    const header = root.querySelector<HTMLElement>('[aria-labelledby="specialist-title"]')!;
    const h1 = header.querySelector<HTMLElement>('h1');
    expect(h1?.hasAttribute('appAnimateOnScroll')).toBe(true);
    expect(h1?.style.getPropertyValue('--index')).toBe('1');

    const chips = Array.from(header.querySelectorAll<HTMLElement>('ul[aria-label="Specialties"] > li'));
    expect(chips.every((chip) => chip.hasAttribute('appAnimateOnScroll'))).toBe(true);
    expect(chips.map((chip) => chip.style.getPropertyValue('--index'))).toEqual(['0']);

    const headings = Array.from(root.querySelectorAll<HTMLElement>('section[aria-labelledby] h2'));
    expect(headings.every((heading) => heading.hasAttribute('appAnimateOnScroll'))).toBe(true);
  });

  describe('header avatar', () => {
    const headerOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[aria-labelledby="specialist-title"]')!;

    it('shows the expert Google sign-in image', () => {
      const img = headerOf(root).querySelector('img');
      expect(img?.getAttribute('src')).toBe(GOOGLE_AVATAR);
      expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
      expect(root.innerHTML).not.toContain('ritika.avif');
    });

    it('falls back to initials when there is no avatar url', async () => {
      const bare = await render({});
      const header = headerOf(bare.nativeElement as HTMLElement);
      expect(header.querySelector('img')).toBeNull();
      expect(header.textContent).toContain('CE');
    });

    it('shows no Online pill by default', () => {
      expect(headerOf(root).textContent).not.toContain('Online');
      expect(root.textContent).not.toContain('Online');
    });

    it('shows no Verified specialist badge by default', () => {
      expect(root.querySelector('[aria-label="Verified specialist"]')).toBeNull();
    });

    it('falls back to initials when the image fails to load', () => {
      headerOf(root).querySelector('img')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      const header = headerOf(root);
      expect(header.querySelector('img')).toBeNull();
      expect(header.textContent).toContain('CE');
    });
  });
});

describe('buildDonut', () => {
  const circumference = 2 * Math.PI * 40;

  it('returns an empty ring with finite numbers for zero, negative or invalid totals', () => {
    for (const [completed, total] of [[0, 0], [3, 0], [1, -2], [Number.NaN, 5], [1, Number.POSITIVE_INFINITY]]) {
      const donut = buildDonut(completed, total, circumference);
      expect(donut.hasData).toBe(false);
      expect(donut.label).toBe('No sessions today');
      expect(donut.offset).toBe(circumference);
      expect(Number.isFinite(donut.offset)).toBe(true);
    }
  });

  it('offsets the arc by the undrawn share', () => {
    const donut = buildDonut(1, 5, circumference);
    expect(donut.hasData).toBe(true);
    expect(donut.label).toBe('1 of 5 sessions completed');
    expect(donut.offset).toBe(Math.round(circumference * 0.8 * 100) / 100);
    expect(buildDonut(9, 5, circumference).offset).toBe(0);
  });
});

describe('buildChart', () => {
  it('returns no points and no path for empty data', () => {
    const chart = buildChart([]);
    expect(chart).toEqual({ hasData: false, points: [], path: '', label: 'No session data yet' });
  });

  it('places a single point mid-chart without dividing by zero', () => {
    const chart = buildChart([{ label: 'W1', value: 6 }]);
    expect(chart.hasData).toBe(true);
    expect(chart.points).toHaveLength(1);
    expect(Number.isFinite(chart.points[0].x)).toBe(true);
    expect(chart.path).toMatch(/^M\d+(\.\d+)? \d+(\.\d+)?$/);
    expect(chart.path).not.toMatch(/NaN|Infinity/);
  });

  it('draws a path through several points', () => {
    const chart = buildChart([
      { label: 'W1', value: 6 },
      { label: 'W2', value: 9 },
      { label: 'W3', value: 12 },
    ]);
    expect(chart.points.map((point) => point.x)).toEqual([36, 170, 304]);
    expect(chart.path.startsWith('M36 ')).toBe(true);
    expect(chart.path.match(/L/g)).toHaveLength(2);
    expect(chart.label).toBe('Line chart of sessions over the last 4 weeks: W1 6, W2 9, W3 12');
  });
});
