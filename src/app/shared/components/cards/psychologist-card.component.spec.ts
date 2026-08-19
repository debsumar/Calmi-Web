import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
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
    fixture.componentRef.setInput('name', 'Ayushi Arora');
    fixture.componentRef.setInput('profileId', 'ayushi-arora');
    fixture.componentRef.setInput('price', 2000);
    fixture.componentRef.setInput('duration', '50 mins');
    fixture.componentRef.setInput('rating', 4.9);
    fixture.componentRef.setInput('reviews', 128);
    fixture.componentRef.setInput('specialties', ['Anxiety & Stress', 'Depression', 'Relationship']);
    fixture.componentRef.setInput('languages', ['English', 'Hindi', 'Punjabi']);
    fixture.detectChanges();
  });

  it('renders the psychologist details and initials placeholder', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Ayushi Arora');
    expect(text).toContain('₹2000');
    expect(text).toContain('for 50 mins');
    expect(text).toContain('4.9');
    expect(text).toContain('(128)');
    expect(text).toContain('Anxiety & Stress');
    expect(text).toContain('Depression');
    expect(text).toContain('Relationship');
    expect(text).toContain('Speaks: English, Hindi, Punjabi');
    const profileLink = fixture.nativeElement.querySelector('a[aria-label="View Ayushi Arora profile"]') as HTMLAnchorElement;
    expect(profileLink).not.toBeNull();
    expect(profileLink.getAttribute('href')).toBe('/therapy/ayushi-arora');
    expect(fixture.nativeElement.querySelector('[aria-hidden="true"]').textContent).toContain('AA');
  });

  it('emits when Book Session is clicked', () => {
    let emitted = false;
    fixture.componentInstance.booked.subscribe(() => { emitted = true; });

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toBe(true);
  });
});
