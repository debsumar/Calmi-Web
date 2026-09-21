import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideArrowLeft, provideLucideIcons } from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { BreadcrumbComponent } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<BreadcrumbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [provideRouter([]), provideLucideIcons(LucideArrowLeft)],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.componentRef.setInput('backLink', '/home');
    fixture.componentRef.setInput('backLabel', 'Back to home');
    fixture.componentRef.setInput('currentPage', 'Journal');
  });

  it('renders accessible back and current-page breadcrumb markup', () => {
    fixture.componentRef.setInput('fragment', 'latest');
    fixture.componentRef.setInput('navClass', 'mb-6 md:mb-8');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const nav = root.querySelector('nav[aria-label="Breadcrumb"]') as HTMLElement;
    const link = nav.querySelector('a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/home#latest');
    expect(link.textContent).toContain('Back to home');
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toContain('Journal');
    expect(nav.querySelector('svg[lucideArrowLeft]')).not.toBeNull();
    expect(nav.className).toContain('mb-6');
    expect(nav.style.getPropertyValue('--index')).toBe('');
  });

  it('applies the animation index only when animation is enabled', () => {
    fixture.componentRef.setInput('animate', true);
    fixture.componentRef.setInput('animationIndex', 3);
    fixture.detectChanges();

    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Breadcrumb"]') as HTMLElement;
    expect(nav.style.getPropertyValue('--index')).toBe('3');
  });
});
