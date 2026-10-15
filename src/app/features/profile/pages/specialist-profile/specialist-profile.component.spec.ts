// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { SpecialistProfileComponent } from './specialist-profile.component';

const GOOGLE_AVATAR = 'https://lh3.googleusercontent.com/a/expert-photo.jpg';

function authStub(userMetadata: Record<string, unknown> | null) {
  return {
    currentUser: () => (userMetadata ? { email: 'expert@example.com', user_metadata: userMetadata } : null),
  };
}

async function render(userMetadata: Record<string, unknown> | null) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SpecialistProfileComponent],
    providers: [{ provide: AuthService, useValue: authStub(userMetadata) }],
  }).compileComponents();
  const fixture = TestBed.createComponent(SpecialistProfileComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SpecialistProfileComponent', () => {
  let fixture: ComponentFixture<SpecialistProfileComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    fixture = await render({ avatar_url: GOOGLE_AVATAR });
    root = fixture.nativeElement as HTMLElement;
  });

  it('renders the specialist name as the page heading and no placeholder', () => {
    expect(root.querySelector('h1')?.textContent).toContain('Dr. Garima Adhikari');
    expect(root.textContent).not.toContain('Coming soon');
  });

  it('uses the expert Google sign-in name and email for heading, alt, initials and info rows', async () => {
    const google = await render({ full_name: 'Asha Rao', avatar_url: GOOGLE_AVATAR });
    const el = google.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Asha Rao');
    expect(el.querySelector('img[referrerpolicy="no-referrer"]')?.getAttribute('alt')).toBe('Portrait of Asha Rao');
    expect(el.querySelector('dl')?.textContent).toContain('Asha Rao');
    expect(el.querySelector('dl')?.textContent).toContain('expert@example.com');
    expect(el.textContent).not.toContain('Garima');

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

  it('renders 5 session rows and 4 report download buttons', () => {
    expect(root.querySelectorAll('ul[aria-label="Today\'s sessions"] > li')).toHaveLength(5);
    expect(root.querySelectorAll('button[aria-label^="Download "]')).toHaveLength(4);
  });

  it('formats earnings with Indian digit grouping', () => {
    expect(root.textContent).toContain('₹4,800');
    expect(root.textContent).toContain('₹28,800');
    expect(root.textContent).toContain('₹1,12,600');
  });

  it('exposes accessible donut and chart labels', () => {
    expect(root.querySelector('svg[aria-label="1 of 5 sessions completed"]')).not.toBeNull();
    expect(root.querySelector('svg[role="img"][aria-label^="Line chart of sessions"]')).not.toBeNull();
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

  it('staggers header text, specialty chips and card headings with local indexes', () => {
    const header = root.querySelector<HTMLElement>('[aria-labelledby="specialist-title"]')!;
    const h1 = header.querySelector<HTMLElement>('h1');
    expect(h1?.hasAttribute('appAnimateOnScroll')).toBe(true);
    expect(h1?.style.getPropertyValue('--index')).toBe('1');

    const chips = Array.from(header.querySelectorAll<HTMLElement>('ul[aria-label="Specialties"] > li'));
    expect(chips.every((chip) => chip.hasAttribute('appAnimateOnScroll'))).toBe(true);
    expect(chips.map((chip) => chip.style.getPropertyValue('--index'))).toEqual(['0', '1', '2', '3', '4']);

    const headings = Array.from(root.querySelectorAll<HTMLElement>('section[aria-labelledby] h2'));
    expect(headings.every((heading) => heading.hasAttribute('appAnimateOnScroll'))).toBe(true);
  });

  it('staggers session and report rows by their position in the list', () => {
    const indexes = (selector: string) =>
      Array.from(root.querySelectorAll<HTMLElement>(selector)).map((row) => row.style.getPropertyValue('--index'));

    expect(root.querySelectorAll('ul[aria-label="Today\'s sessions"] > li[appanimateonscroll]')).toHaveLength(5);
    expect(indexes('ul[aria-label="Today\'s sessions"] > li')).toEqual(['0', '1', '2', '3', '4']);
    expect(root.querySelectorAll('ul[aria-label="Shared reports"] > li[appanimateonscroll]')).toHaveLength(4);
    expect(indexes('ul[aria-label="Shared reports"] > li')).toEqual(['0', '1', '2', '3']);
  });

  it('draws the donut ring and the practice line in, with static final values in the markup', () => {
    // SVG attribute names are case-sensitive, so these queries use the authored case.
    const arc = root.querySelector('svg[aria-label="1 of 5 sessions completed"] .ring-arc');
    expect(arc).not.toBeNull();
    expect(arc?.hasAttribute('appDrawOnScroll')).toBe(true);
    expect(arc?.getAttribute('stroke-dasharray')).toBe(String(fixture.componentInstance.donutCircumference));
    expect(arc?.getAttribute('stroke-dashoffset')).toBe(String(fixture.componentInstance.donutOffset));

    const chart = root.querySelector('svg[aria-label^="Line chart of sessions"]');
    const line = chart?.querySelector('.spark-line');
    expect(line?.hasAttribute('appDrawOnScroll')).toBe(true);
    expect(line?.getAttribute('pathLength')).toBe('1');

    const dots = Array.from(chart!.querySelectorAll('.chart-dot'));
    expect(dots).toHaveLength(4);
    expect(dots.every((dot) => dot.hasAttribute('appDrawOnScroll'))).toBe(true);
    expect(dots.map((dot) => (dot as SVGElement).style.getPropertyValue('--index'))).toEqual(['0', '1', '2', '3']);
  });

  it('dates the September mood report in September', () => {
    expect(root.textContent).toContain('Mood Insights Report – September 2026');
    expect(root.textContent).toContain('Sep 12, 2026');
    expect(root.textContent).not.toContain('Aug 12, 2026');
  });

  it('lists shared reports newest first', () => {
    const dates = Array.from(root.querySelectorAll('ul[aria-label="Shared reports"] > li > p'))
      .map((node) => Date.parse(node.textContent!.trim()));
    expect(dates).toHaveLength(4);
    expect(dates.every((time) => Number.isFinite(time))).toBe(true);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(root.textContent).toContain('Sep 02, 2026');
    expect(root.textContent).not.toContain('Jul 28, 2026');
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
      expect(header.textContent).toContain('DG');
      expect(header.textContent).toContain('Online');
    });

    it('falls back to initials when the image fails to load', () => {
      headerOf(root).querySelector('img')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      const header = headerOf(root);
      expect(header.querySelector('img')).toBeNull();
      expect(header.textContent).toContain('DG');
    });
  });
});
