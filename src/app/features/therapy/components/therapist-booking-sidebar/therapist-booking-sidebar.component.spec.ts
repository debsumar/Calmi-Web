import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatePicker } from 'primeng/datepicker';
import { THERAPISTS } from '@/features/therapy/data/therapist.data';
import { TherapistBookingSidebarComponent } from './therapist-booking-sidebar.component';

describe('TherapistBookingSidebarComponent', () => {
  let fixture: ComponentFixture<TherapistBookingSidebarComponent>;
  let component: TherapistBookingSidebarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TherapistBookingSidebarComponent] }).compileComponents();
    fixture = TestBed.createComponent(TherapistBookingSidebarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('therapist', THERAPISTS[0]);
    fixture.detectChanges();
  });

  it('renders inline DatePicker inputs, availability legend, and slots', () => {
    const root = fixture.nativeElement as HTMLElement;
    const picker = root.querySelector('p-datepicker');
    expect(picker).not.toBeNull();
    expect(root.textContent).toContain('Past');
    expect(root.textContent).toContain('Available');
    expect(root.textContent).toContain('Unavailable');
    expect(component.availableSlots().length).toBeGreaterThan(0);
    expect(root.querySelector('[role="radiogroup"]')).not.toBeNull();
    // Target design: header carries no icon, and date cells are rectangular tiles
    // (Aura's default is a 50% radius circle, overridden through scoped dt tokens).
    expect(root.querySelector('svg[lucideCalendarDays]')).toBeNull();
    expect(component.calendarTokens.date.borderRadius).toBe('0.375rem');
    expect(component.calendarTokens.date.width).not.toBe(component.calendarTokens.date.height);
    expect(root.querySelector('p-datepicker')?.getAttribute('ng-reflect-first-day-of-week') ?? '0').toBe('0');
  });

  it('clears the slot when the date changes and shows slots for the next available date', () => {
    const available = THERAPISTS[0].availability.filter((day) => day.state === 'available');
    const first = available[0];
    expect(first).toBeDefined();
    component.selectedSlot.set(first?.slots[0]?.id ?? null);
    component.onDateSelected(new Date(2099, 0, 1));
    expect(component.selectedSlot()).toBeNull();
    component.onDateSelected(new Date(Number(available[1]?.date.slice(0, 4)), Number(available[1]?.date.slice(5, 7)) - 1, Number(available[1]?.date.slice(8, 10))));
    expect(component.availableSlots().length).toBeGreaterThan(0);
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('shows exact validation errors after an invalid submit', () => {
    component.submitBooking(new Event('submit'));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Enter your name (2–80 characters).');
    expect(root.textContent).toContain('Enter a valid phone number.');
    expect(root.querySelector('#booking-name[aria-invalid="true"]')).not.toBeNull();
    expect(root.querySelector('#booking-phone[aria-invalid="true"]')).not.toBeNull();
    const errorIcons = root.querySelectorAll('svg[lucideCircleAlert]');
    expect(errorIcons.length).toBeGreaterThan(0);
    errorIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });

  it('accepts valid details locally without a network request', () => {
    const first = THERAPISTS[0].availability.find((day) => day.state === 'available');
    component.name.set('Demo Person');
    component.phone.set('+919876543210');
    component.onDateSelected(first ? new Date(`${first.date.slice(0, 4)}-${first.date.slice(5, 7)}-${first.date.slice(8, 10)}T00:00:00`) : null);
    component.selectSlot(first?.slots[0]?.id ?? '');
    fixture.detectChanges();
    expect(component.formValid()).toBe(true);
    component.submitBooking(new Event('submit'));
    fixture.detectChanges();

    // Step 1: nothing is booked yet, the details are shown for approval.
    expect(component.reviewOpen()).toBe(true);
    expect(component.bookingSaved()).toBe(false);
    const review = fixture.nativeElement.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement;
    expect(review.textContent).toContain('Confirm your booking?');
    expect(review.textContent).toContain(THERAPISTS[0].name);
    expect(review.textContent).toContain(`₹${THERAPISTS[0].price}`);
    expect(review.querySelectorAll('button')).toHaveLength(2);

    // Step 2: approving shows the success dialog.
    component.confirmBooking();
    fixture.detectChanges();
    expect(component.reviewOpen()).toBe(false);
    expect(component.bookingSaved()).toBe(true);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Booking confirmed');
    expect(dialog.textContent).not.toContain('this device only');
    expect(dialog.querySelector('button')).toBeNull();
    expect(dialog.querySelector('.confirmation-tick')).not.toBeNull();

    component.dismissConfirmation();
    fixture.detectChanges();
    expect(component.bookingSaved()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('cancels the review without booking', () => {
    const first = THERAPISTS[0].availability.find((day) => day.state === 'available' && day.slots.length > 0);
    component.name.set('Asha Rao');
    component.phone.set('+919876543210');
    component.onDateSelected(first ? new Date(`${first.date.slice(0, 4)}-${first.date.slice(5, 7)}-${first.date.slice(8, 10)}T00:00:00`) : null);
    component.selectSlot(first?.slots[0]?.id ?? '');
    component.submitBooking(new Event('submit'));
    fixture.detectChanges();
    expect(component.reviewOpen()).toBe(true);

    component.cancelReview();
    fixture.detectChanges();
    expect(component.reviewOpen()).toBe(false);
    expect(component.bookingSaved()).toBe(false);
  });
});
