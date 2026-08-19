import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { LucideCircleAlert, LucideCircleCheck, LucideLock } from '@lucide/angular';
import {
  AvailabilityState,
  TherapistAvailabilityDay,
} from '@/features/therapy/data/therapist.data';

type DateMeta = { day: number; month: number; year: number };

@Component({
  selector: 'app-therapist-booking-sidebar',
  imports: [DatePicker, FormsModule, LucideCircleAlert, LucideCircleCheck, LucideLock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="min-w-0 rounded-2xl border border-hairline bg-surface shadow-card lg:sticky lg:top-6" aria-labelledby="booking-heading">
      <header class="rounded-t-2xl bg-brand-deep p-8 text-center text-on-brand">
        <h2 id="booking-heading" class="font-sans text-2xl font-bold leading-tight md:text-3xl">Book a Session</h2>
        <p class="mt-2 text-base">Choose your preferred date and time</p>
      </header>

      <div class="min-w-0 space-y-6 p-5 md:p-6">
        <section aria-labelledby="date-heading">
          <h3 id="date-heading" class="font-sans text-lg font-bold text-ink">Pick a Date</h3>
          <p-datepicker
            class="mt-3 block w-full max-w-full min-w-0"
            [dt]="calendarTokens"
            [inline]="true"
            [ngModel]="selectedDate()"
            (ngModelChange)="onDateSelected($event)"
            [minDate]="minDate()"
            [maxDate]="maxDate()"
            [disabledDates]="disabledDates()"
            [firstDayOfWeek]="0"
            [showOtherMonths]="false"
            ariaLabel="Choose a session date"
            ariaLabelledBy="date-heading">
            <ng-template #date let-date let-selected="selected">
              <span class="relative flex h-8 w-11 items-center justify-center rounded-md text-xs"
                    [class.bg-sunken]="dateMetaState(date) === 'past'"
                    [class.text-ink-muted]="dateMetaState(date) === 'past'"
                    [class.bg-brand-deep]="selected || isSelectedMeta(date)"
                    [class.text-on-brand]="selected || isSelectedMeta(date)"
                    [class.text-ink]="dateMetaState(date) !== 'past' && !selected && !isSelectedMeta(date)">
                <span>{{ date.day }}</span>
                @if (dateMetaState(date) === 'available') {
                  <span class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-success" [class.ring-1]="selected || isSelectedMeta(date)" [class.ring-surface]="selected || isSelectedMeta(date)" aria-hidden="true"></span>
                } @else if (dateMetaState(date) === 'unavailable') {
                  <span class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-danger" [class.ring-1]="selected || isSelectedMeta(date)" [class.ring-surface]="selected || isSelectedMeta(date)" aria-hidden="true"></span>
                }
                <span class="sr-only">{{ dateLabel(date) }}</span>
              </span>
            </ng-template>
          </p-datepicker>
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft" aria-label="Calendar legend">
            <span class="inline-flex items-center gap-2"><span class="h-4 w-7 rounded-full border border-hairline bg-sunken" aria-hidden="true"></span>Past</span>
            <span class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-success" aria-hidden="true"></span>Available</span>
            <span class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-danger" aria-hidden="true"></span>Unavailable</span>
          </div>
          @if (dateInvalid()) {
            <p class="mt-2 flex items-center gap-2 text-xs text-danger" role="alert"><svg lucideCircleAlert [size]="16" class="text-danger" aria-hidden="true"></svg>Choose an available date.</p>
          }
        </section>

        <section aria-labelledby="slots-heading">
          <h3 id="slots-heading" class="font-sans text-lg font-bold text-ink">Pick a Time</h3>
          @if (availableSlots().length > 0) {
            <div class="mt-3 grid min-w-0 grid-cols-3 gap-2" role="radiogroup" aria-labelledby="slots-heading">
              @for (slot of availableSlots(); track slot.id) {
                <button type="button" role="radio" [attr.aria-checked]="selectedSlot() === slot.id" [attr.aria-label]="slot.label"
                        (click)="selectSlot(slot.id)"
                        class="min-w-0 truncate rounded-full border border-brand px-2 py-3 text-xs font-semibold text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        [class.bg-brand-deep]="selectedSlot() === slot.id"
                        [class.text-on-brand]="selectedSlot() === slot.id"
                        [class.bg-surface]="selectedSlot() !== slot.id">{{ slot.label }}</button>
              }
            </div>
          } @else {
            <p class="mt-3 rounded-lg bg-sunken p-4 text-base text-ink-soft">No times available for this date.</p>
          }
          @if (slotInvalid()) {
            <p class="mt-2 flex items-center gap-2 text-xs text-danger" role="alert"><svg lucideCircleAlert [size]="16" class="text-danger" aria-hidden="true"></svg>Select an available time.</p>
          }
        </section>

        <form novalidate (submit)="submitBooking($event)" class="space-y-4" aria-labelledby="details-heading">
          <div>
            <h3 id="details-heading" class="font-sans text-lg font-bold text-ink">Enter the following details</h3>
          </div>
          <div>
            <label for="booking-name" class="sr-only">Your name</label>
            <input id="booking-name" name="name" autocomplete="name" type="text" placeholder="Your name" [value]="name()" (input)="setName($event)"
                   [attr.aria-invalid]="nameInvalid() ? 'true' : null" [attr.aria-describedby]="nameInvalid() ? 'booking-name-error' : 'booking-name-help'"
                   class="w-full rounded-lg border bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand"
                   [class.border-danger]="nameInvalid()" [class.border-hairline]="!nameInvalid()" />
            @if (nameInvalid()) { <p id="booking-name-error" class="mt-1 flex items-center gap-2 text-xs text-danger" role="alert"><svg lucideCircleAlert [size]="15" class="text-danger" aria-hidden="true"></svg>Enter your name (2–80 characters).</p> }
            @if (!nameInvalid()) { <p id="booking-name-help" class="sr-only">Name must be 2 to 80 characters.</p> }
          </div>
          <div>
            <label for="booking-phone" class="sr-only">Phone number</label>
            <input id="booking-phone" name="phone" autocomplete="tel" type="tel" inputmode="tel" placeholder="Phone number" [value]="phone()" (input)="setPhone($event)"
                   [attr.aria-invalid]="phoneInvalid() ? 'true' : null" [attr.aria-describedby]="phoneInvalid() ? 'booking-phone-error' : 'booking-phone-help'"
                   class="w-full rounded-lg border bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand"
                   [class.border-danger]="phoneInvalid()" [class.border-hairline]="!phoneInvalid()" />
            @if (phoneInvalid()) { <p id="booking-phone-error" class="mt-1 flex items-center gap-2 text-xs text-danger" role="alert"><svg lucideCircleAlert [size]="15" class="text-danger" aria-hidden="true"></svg>Enter a valid phone number.</p> }
            @if (!phoneInvalid()) { <p id="booking-phone-help" class="sr-only">Use an international phone number, for example plus country code followed by digits.</p> }
          </div>
          <div>
            <label for="booking-message" class="sr-only">What would you like support with?</label>
            <textarea id="booking-message" name="message" autocomplete="off" placeholder="What would you like support with?" rows="4" maxlength="1000" [value]="message()" (input)="setMessage($event)"
                      [attr.aria-invalid]="messageInvalid() ? 'true' : null" [attr.aria-describedby]="messageInvalid() ? 'booking-message-error' : 'booking-message-help'"
                      class="w-full resize-y rounded-lg border bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand"
                      [class.border-danger]="messageInvalid()" [class.border-hairline]="!messageInvalid()"></textarea>
            @if (messageInvalid()) { <p id="booking-message-error" class="mt-1 flex items-center gap-2 text-xs text-danger" role="alert"><svg lucideCircleAlert [size]="15" class="text-danger" aria-hidden="true"></svg>Keep your message under 1,000 characters.</p> }
            @if (!messageInvalid()) { <p id="booking-message-help" class="mt-1 text-xs text-ink-soft">Up to 1,000 characters.</p> }
          </div>
          <button type="submit" [disabled]="!formValid()"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-deep px-5 py-3 text-base font-semibold text-on-brand transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60">
            <span>Book a Session</span>
          </button>
          <p class="flex items-center justify-center gap-2 text-xs text-ink-soft">
            <svg lucideLock [size]="14" aria-hidden="true"></svg>
            Your information is private and secure.
          </p>
          @if (bookingSaved()) {
            <p class="flex items-start gap-2 rounded-lg bg-sunken p-4 text-xs text-ink-soft" role="status"><svg lucideCircleCheck [size]="18" class="mt-0.5 shrink-0 text-success" aria-hidden="true"></svg>Details saved locally for this local demo; not submitted.</p>
          }
        </form>
      </div>
    </aside>
  `,
})
export class TherapistBookingSidebarComponent {
  readonly availability = input.required<TherapistAvailabilityDay[]>();
  readonly today = this.startOfDay(new Date());
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedSlot = signal<string | null>(null);
  readonly name = signal('');
  readonly phone = signal('');
  readonly message = signal('');
  readonly submitAttempted = signal(false);
  readonly bookingSaved = signal(false);

  readonly minDate = computed(() => this.today);
  readonly maxDate = computed(() => {
    const days = this.availability();
    return days.length > 0 ? this.parseDateKey(days[days.length - 1].date) : this.today;
  });
  readonly disabledDates = computed(() => this.availability().filter((day) => day.state === 'unavailable').map((day) => this.parseDateKey(day.date)));
  readonly availableSlots = computed(() => {
    const date = this.selectedDate();
    const day = date ? this.dayForDate(date) : undefined;
    return day?.state === 'available' ? day.slots : [];
  });
  readonly nameInvalid = computed(() => this.submitAttempted() && !this.isNameValid());
  readonly phoneInvalid = computed(() => this.submitAttempted() && !this.isPhoneValid());
  readonly dateInvalid = computed(() => this.submitAttempted() && !this.isDateValid());
  readonly slotInvalid = computed(() => this.submitAttempted() && !this.isSlotValid());
  readonly messageInvalid = computed(() => this.submitAttempted() && this.message().length > 1000);
  readonly formValid = computed(() => this.isNameValid() && this.isPhoneValid() && this.isDateValid() && this.isSlotValid() && this.message().length <= 1000);
  /**
   * Component-scoped PrimeNG design tokens. Keys are the datepicker's OWN token
   * sections (panel, header, date, ...) with NO `datepicker` wrapper: `[dt]` is
   * already scoped to this component, so wrapping the object would emit
   * `--p-datepicker-datepicker-*` and silently do nothing.
   * Aura ships `date.borderRadius: 50%`; the design calls for rectangular tiles.
   */
  readonly calendarTokens = {
    panel: {
      background: 'transparent',
      borderColor: 'transparent',
      borderRadius: '0',
      shadow: 'none',
      padding: '0',
    },
    header: {
      background: 'transparent',
      borderColor: 'transparent',
      color: '{content.color}',
      padding: '0 0 0.5rem 0',
    },
    title: { gap: '0.25rem', fontWeight: '700' },
    selectMonth: { borderRadius: '0.375rem', padding: '0.25rem 0.5rem' },
    selectYear: { borderRadius: '0.375rem', padding: '0.25rem 0.5rem' },
    group: { borderColor: 'transparent', gap: '0' },
    dayView: { margin: '0.5rem 0 0 0' },
    weekDay: { padding: '0.375rem 0', fontWeight: '600', color: '{text.muted.color}' },
    date: {
      width: '2.75rem',
      height: '2rem',
      borderRadius: '0.375rem',
      padding: '0',
      color: '{content.color}',
      hoverBackground: '{content.hover.background}',
      hoverColor: '{content.hover.color}',
      selectedBackground: '{primary.600}',
      selectedColor: '{primary.contrast.color}',
      rangeSelectedBackground: '{highlight.background}',
      rangeSelectedColor: '{highlight.color}',
      focusRing: { width: '2px', style: 'solid', color: '{primary.color}', offset: '1px', shadow: 'none' },
    },
  };

  constructor() {
    effect(() => {
      if (this.selectedDate() || this.availability().length === 0) {
        return;
      }
      const first = this.availability().find((day) => day.state === 'available' && day.slots.length > 0);
      if (first) {
        this.selectedDate.set(this.parseDateKey(first.date));
        this.selectedSlot.set(first.slots[0]?.id ?? null);
      }
    });
  }

  onDateSelected(date: Date | null): void {
    this.selectedDate.set(date ? this.startOfDay(date) : null);
    this.selectedSlot.set(null);
    this.bookingSaved.set(false);
  }

  selectSlot(slotId: string): void {
    if (this.availableSlots().some((slot) => slot.id === slotId)) {
      this.selectedSlot.set(slotId);
      this.bookingSaved.set(false);
    }
  }

  setName(event: Event): void { this.name.set((event.target as HTMLInputElement).value); this.bookingSaved.set(false); }
  setPhone(event: Event): void { this.phone.set((event.target as HTMLInputElement).value); this.bookingSaved.set(false); }
  setMessage(event: Event): void { this.message.set((event.target as HTMLTextAreaElement).value); this.bookingSaved.set(false); }

  submitBooking(event: Event): void {
    event.preventDefault();
    this.submitAttempted.set(true);
    if (!this.formValid()) {
      this.bookingSaved.set(false);
      return;
    }
    // TODO: future authenticated endpoint, explicit consent/retention review, server-side field validation, and server-authoritative availability recheck.
    this.bookingSaved.set(true);
  }

  dateMetaState(meta: DateMeta): AvailabilityState | 'past' {
    const date = new Date(meta.year, meta.month, meta.day);
    if (date < this.minDate()) {
      return 'past';
    }
    return this.availability().find((day) => day.date === this.toDateKey(date))?.state ?? 'unavailable';
  }

  dateStateMarker(meta: DateMeta): string {
    const state = this.dateMetaState(meta);
    return state === 'available' ? 'Â·' : state === 'past' ? 'â€“' : 'Ã—';
  }

  dateLabel(meta: DateMeta): string {
    const state = this.dateMetaState(meta);
    return `${meta.day}, ${state === 'available' ? 'Available' : state === 'past' ? 'Past â€” booking closed' : 'Unavailable'}`;
  }

  isSelectedMeta(meta: DateMeta): boolean {
    const date = this.selectedDate();
    return !!date && this.toDateKey(date) === this.toDateKey(new Date(meta.year, meta.month, meta.day));
  }

  private isNameValid(): boolean { const value = this.name().trim(); return value.length >= 2 && value.length <= 80; }
  private isPhoneValid(): boolean { return /^\+?[1-9]\d{7,14}$/.test(this.phone().trim()); }
  private isDateValid(): boolean {
    const date = this.selectedDate();
    if (!date || date < this.minDate() || date > this.maxDate()) return false;
    return this.dayForDate(date)?.state === 'available';
  }
  private isSlotValid(): boolean { const id = this.selectedSlot(); return !!id && this.availableSlots().some((slot) => slot.id === id); }
  private dayForDate(date: Date): TherapistAvailabilityDay | undefined { return this.availability().find((day) => day.date === this.toDateKey(date)); }
  private startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  private parseDateKey(key: string): Date { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); }
  private toDateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
}
