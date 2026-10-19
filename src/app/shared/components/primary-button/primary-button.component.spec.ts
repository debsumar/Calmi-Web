import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrimaryButtonComponent } from './primary-button.component';

describe('PrimaryButtonComponent', () => {
  let fixture: ComponentFixture<PrimaryButtonComponent>;

  const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PrimaryButtonComponent] }).compileComponents();
    fixture = TestBed.createComponent(PrimaryButtonComponent);
  });

  it('is enabled and emits when clicked by default', () => {
    let clicks = 0;
    fixture.componentRef.setInput('label', 'Join The Community');
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    fixture.detectChanges();

    expect(button().disabled).toBe(false);
    expect(button().getAttribute('aria-disabled')).toBeNull();

    button().click();
    expect(clicks).toBe(1);
  });

  it('blocks interaction and exposes disabled state when disabled', () => {
    let clicks = 0;
    fixture.componentRef.setInput('label', 'Coming Soon');
    fixture.componentRef.setInput('disabled', true);
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    fixture.detectChanges();

    expect(button().textContent?.trim()).toBe('Coming Soon');
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-disabled')).toBe('true');

    button().click();
    expect(clicks).toBe(0);
  });

  it('defaults to type="button" so it never submits an enclosing form', () => {
    fixture.detectChanges();
    expect(button().getAttribute('type')).toBe('button');
  });

  it('lets the type input override the default', () => {
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    expect(button().type).toBe('submit');
  });

  it('applies the type to the outline variant too', () => {
    fixture.componentRef.setInput('variant', 'outline');
    fixture.detectChanges();
    expect(button().type).toBe('button');
  });

  it('emits once per click and ignores clicks that reach it while disabled', () => {
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    fixture.detectChanges();

    button().click();
    button().click();
    expect(clicks).toBe(2);

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.componentInstance.onClick();
    expect(clicks).toBe(2);
  });
});
