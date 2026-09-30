// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { SpecialistProfileComponent } from './specialist-profile.component';

describe('SpecialistProfileComponent', () => {
  let fixture: ComponentFixture<SpecialistProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SpecialistProfileComponent] }).compileComponents();
    fixture = TestBed.createComponent(SpecialistProfileComponent);
    fixture.detectChanges();
  });

  it('renders the specialist profile heading and coming soon status', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Specialist Profile');
    expect(root.textContent).toContain('Coming soon');
  });
});
