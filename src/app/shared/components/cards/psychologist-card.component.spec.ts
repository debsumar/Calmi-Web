import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideLucideIcons, LucideStar } from '@lucide/angular';
import { PsychologistCardComponent } from './psychologist-card.component';

describe('PsychologistCardComponent', () => {
  let fixture: ComponentFixture<PsychologistCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PsychologistCardComponent],
      providers: [provideRouter([]), provideLucideIcons(LucideStar)],
    }).compileComponents();

    fixture = TestBed.createComponent(PsychologistCardComponent);
    fixture.componentRef.setInput('name', 'Gargi Yadav');
    fixture.componentRef.setInput('profileId', 'gargi-yadav');
    fixture.componentRef.setInput('price', 2000);
    fixture.componentRef.setInput('duration', '50 mins');
    fixture.componentRef.setInput('rating', 4.9);
    fixture.componentRef.setInput('reviews', 128);
    fixture.componentRef.setInput('specialties', ['Anxiety & Stress', 'Depression', 'Relationship']);
    fixture.componentRef.setInput('languages', ['English', 'Hindi']);
    fixture.detectChanges();
  });

  it('renders the psychologist details and initials placeholder', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Gargi Yadav');
    expect(text).toContain('₹2000');
    expect(text).toContain('for 50 mins');
    expect(text).toContain('4.9');
    expect(text).toContain('(128)');
    expect(text).toContain('Anxiety & Stress');
    expect(text).toContain('Depression');
    expect(text).toContain('Relationship');
    expect(text).toContain('Speaks: English, Hindi');
    const profileLink = fixture.nativeElement.querySelector('a[aria-label="View Gargi Yadav profile"]') as HTMLAnchorElement;
    expect(profileLink).not.toBeNull();
    expect(profileLink.getAttribute('href')).toBe('/therapy/gargi-yadav');
    expect(fixture.nativeElement.querySelector('[aria-hidden="true"]').textContent).toContain('GY');
  });

  it('exposes the whole card and the Book Session control as profile links', () => {
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a[href="/therapy/gargi-yadav"]')
    ) as HTMLAnchorElement[];

    expect(links.length).toBe(2);
    expect(links.some((link) => link.getAttribute('aria-label') === 'Book a session with Gargi Yadav')).toBe(true);
    expect(links.some((link) => link.getAttribute('aria-label') === 'View Gargi Yadav profile')).toBe(true);
  });

  it('cancels navigation when the tap was really a carousel drag', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const overlay = fixture.nativeElement.querySelector('a[aria-label="View Gargi Yadav profile"]') as HTMLAnchorElement;

    overlay.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    overlay.dispatchEvent(new MouseEvent('click', { clientX: 40, clientY: 100, bubbles: true, cancelable: true }));

    expect(navigate).not.toHaveBeenCalled();

    overlay.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    overlay.dispatchEvent(new MouseEvent('click', { clientX: 102, clientY: 101, bubbles: true, cancelable: true }));

    expect(navigate).toHaveBeenCalledWith(['/therapy', 'gargi-yadav']);
  });

  it('routes to the profile from the Book Session control', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const book = fixture.nativeElement.querySelector('a[aria-label="Book a session with Gargi Yadav"]') as HTMLAnchorElement;

    book.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true }));
    book.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50, bubbles: true, cancelable: true }));

    expect(navigate).toHaveBeenCalledWith(['/therapy', 'gargi-yadav']);
  });
});
