import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DownloadComponent } from './download.component';

describe('DownloadComponent', () => {
  let fixture: ComponentFixture<DownloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DownloadComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadComponent);
    fixture.detectChanges();
  });

  it('renders requested headline, supporting copy, breadcrumb, and app name', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Make Space for your Mind.');
    expect(element.textContent).toContain('mood check-ins');
    expect(element.textContent).toContain('Calmi — Mental Wellness App.');
    expect(element.textContent).toContain('Available soon on');
    expect(element.querySelector('nav[aria-label="Breadcrumb"] a[href="/home"]')).not.toBeNull();
  });

  it('uses local app artwork with iPhone layered in front of Android', () => {
    const element = fixture.nativeElement as HTMLElement;
    const images = Array.from(element.querySelectorAll('figure img')) as HTMLImageElement[];
    const android = images.find((image) => image.src.endsWith('/assets/Android.png'));
    const iPhone = images.find((image) => image.src.endsWith('/assets/iPhone.png'));

    expect(android).toBeDefined();
    expect(iPhone).toBeDefined();
    expect(android?.classList).toContain('z-10');
    expect(iPhone?.classList).toContain('z-20');
    expect(android?.getAttribute('alt')).toBe('Rumi AI mobile app screen');
    expect(iPhone?.getAttribute('alt')).toBe('Calmi home mobile app screen');
    expect(android?.getAttribute('decoding')).toBe('async');
    expect(iPhone?.getAttribute('decoding')).toBe('async');
    expect(element.querySelector('figure')?.classList).toContain('md:order-1');
    expect(element.querySelector('h1')?.parentElement?.classList).toContain('md:order-2');
  });

  it('renders local store badges without placeholder or external links', () => {
    const element = fixture.nativeElement as HTMLElement;
    const badges = element.querySelectorAll('[data-store]');

    expect(badges).toHaveLength(2);
    expect(element.querySelector('[data-store="apple"] img')?.getAttribute('src')).toBe('/assets/logos/apple.svg');
    expect(element.querySelector('[data-store="google-play"] img')?.getAttribute('src')).toBe('/assets/logos/Playstore.svg');
    expect(element.querySelectorAll('a[href^="http"]').length).toBe(0);
    expect(element.querySelectorAll('a[href="#"]').length).toBe(0);
  });
});
