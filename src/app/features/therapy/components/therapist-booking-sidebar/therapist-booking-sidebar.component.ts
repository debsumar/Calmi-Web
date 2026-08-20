import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { LucideCircleAlert, LucideLock } from '@lucide/angular';
import {
  AvailabilityState,
  Therapist,
  TherapistAvailabilityDay,
} from '@/features/therapy/data/therapist.data';

type DateMeta = { day: number; month: number; year: number };

@Component({
  selector: 'app-therapist-booking-sidebar',
  imports: [DatePicker, FormsModule, LucideCircleAlert, LucideLock],
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
          <button #submitButton type="submit" [disabled]="!formValid()"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-deep px-5 py-3 text-base font-semibold text-on-brand transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60">
            <span>Book a Session</span>
          </button>
          <p class="flex items-center justify-center gap-2 text-xs text-ink-soft">
            <svg lucideLock [size]="14" aria-hidden="true"></svg>
            Your information is private and secure.
          </p>
        </form>
      </div>
    </aside>

    @if (reviewOpen()) {
      <!-- Confirmation step: nothing is booked until the user approves these
           details, so this dialog has explicit actions and no auto-dismiss. -->
      <div #reviewBackdrop class="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" (click)="cancelReview()">
        <div #review role="dialog" aria-modal="true" aria-labelledby="booking-review-title"
             tabindex="-1" (click)="$event.stopPropagation()" (keydown.escape)="cancelReview()"
             class="confirmation-panel w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-elevated/10 p-8 shadow-2xl backdrop-blur-sm dark:border-white/10">
          <h3 id="booking-review-title" class="dialog-stagger-item text-center font-sans text-2xl font-bold text-white" style="--index: 0">
            Confirm your booking?
          </h3>
          <p class="dialog-stagger-item mt-2 text-center text-sm tracking-wide text-white/80" style="--index: 1">
            Please check these details before we reserve your slot.
          </p>

          <dl class="dialog-stagger-item mt-6 space-y-2 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-white dark:border-white/10" style="--index: 2">
            @for (row of reviewRows(); track row.label) {
              <div class="flex items-baseline justify-between gap-4">
                <dt class="text-white/70">{{ row.label }}</dt>
                <dd class="min-w-0 text-right font-semibold break-words">{{ row.value }}</dd>
              </div>
            }
          </dl>

          <div class="dialog-stagger-item mt-6 flex gap-3" style="--index: 3">
            <button type="button" (click)="cancelReview()"
                    class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Go back
            </button>
            <button #confirmBookingButton type="button" (click)="confirmBooking()"
                    class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-deep px-4 py-3 text-base font-semibold text-on-brand transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Yes, book it
            </button>
          </div>
        </div>
      </div>
    }

    @if (bookingSaved()) {
      <!-- Centred confirmation. Focus moves to the dialog and returns to the
           submit button on close; Escape, a backdrop click, or the short
           auto-dismiss timer all close it with an exit animation. -->
      <div #backdrop class="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" (click)="dismissConfirmation()">
        <div #confirmation role="dialog" aria-modal="true" aria-labelledby="booking-confirmed-title"
             tabindex="-1" (click)="$event.stopPropagation()" (keydown.escape)="dismissConfirmation()"
             class="confirmation-panel w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-elevated/10 p-8 text-center shadow-2xl backdrop-blur-sm dark:border-white/10">
          <span class="dialog-stagger-item mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md" style="--index: 0" aria-hidden="true">
            <svg viewBox="0 0 52 52" class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="4"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle class="confirmation-ring" cx="26" cy="26" r="22" />
              <path class="confirmation-tick" d="M15 27.5 L23 35 L38 19" />
            </svg>
          </span>
          <h3 id="booking-confirmed-title" class="dialog-stagger-item mt-5 font-sans text-2xl font-bold text-white" style="--index: 1">Booking confirmed</h3>
          <p class="dialog-stagger-item mt-2 text-sm tracking-wide text-white/80" style="--index: 2">Your session is reserved for {{ confirmationSummary() }}.</p>
        </div>
      </div>
    }
  `,
  styles: `
    /* Stroke only: the draw-on effect adds no colour of its own. The panel and
       backdrop transitions are driven from the component so the exit animation
       can finish before the dialog leaves the DOM. */
    .confirmation-ring {
      stroke-dasharray: 145;
      stroke-dashoffset: 145;
      animation: confirmation-draw 420ms ease-out 60ms forwards;
    }
    .confirmation-tick {
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: confirmation-draw 300ms ease-out 380ms forwards;
    }
    @keyframes confirmation-draw {
      to { stroke-dashoffset: 0; }
    }
    @media (prefers-reduced-transparency: reduce) {
      /* Glass must degrade to an opaque surface when the user asks for it. */
      .confirmation-panel {
        background-color: var(--color-brand-deep);
        backdrop-filter: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .confirmation-ring,
      .confirmation-tick {
        animation: none;
        stroke-dashoffset: 0;
      }
    }
  `,
})
export class TherapistBookingSidebarComponent {
  readonly therapist = input.required<Therapist>();
  readonly availability = computed(() => this.therapist().availability);
  readonly today = this.startOfDay(new Date());
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedSlot = signal<string | null>(null);
  readonly name = signal('');
  readonly phone = signal('');
  readonly message = signal('');
  readonly submitAttempted = signal(false);
  readonly reviewOpen = signal(false);
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
  readonly confirmationSummary = computed(() => {
    const date = this.selectedDate();
    const slot = this.availableSlots().find((item) => item.id === this.selectedSlot());
    if (!date) {
      return 'your selected slot';
    }
    const day = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    return slot ? `${day} at ${slot.label}` : day;
  });
  readonly reviewRows = computed(() => {
    const profile = this.therapist();
    return [
      { label: 'Therapist', value: profile.name },
      { label: 'When', value: this.confirmationSummary() },
      { label: 'Duration', value: profile.duration },
      { label: 'Mode', value: profile.sessionMode },
      { label: 'Session fee', value: `₹${profile.price}` },
      { label: 'Name', value: this.name().trim() },
      { label: 'Phone', value: this.phone().trim() },
    ];
  });

  private readonly confirmationEl = viewChild<ElementRef<HTMLElement>>('confirmation');
  private readonly backdropEl = viewChild<ElementRef<HTMLElement>>('backdrop');
  private readonly reviewEl = viewChild<ElementRef<HTMLElement>>('review');
  private readonly reviewBackdropEl = viewChild<ElementRef<HTMLElement>>('reviewBackdrop');
  private readonly confirmBookingButton = viewChild<ElementRef<HTMLButtonElement>>('confirmBookingButton');
  private readonly submitButton = viewChild<ElementRef<HTMLButtonElement>>('submitButton');
  private closing = false;
  private dismissTimer: ReturnType<typeof setTimeout> | undefined;
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

    afterRenderEffect(() => {
      if (this.reviewOpen()) {
        const panel = this.reviewEl()?.nativeElement;
        this.animateIn(panel, this.reviewBackdropEl()?.nativeElement);
        // Focus the affirmative action so keyboard users can confirm directly.
        (this.confirmBookingButton()?.nativeElement ?? panel)?.focus();
      }
    });

    afterRenderEffect(() => {
      if (!this.bookingSaved()) {
        return;
      }

      const panel = this.confirmationEl()?.nativeElement;
      panel?.focus();
      this.animateIn(panel, this.backdropEl()?.nativeElement);

      // No dismiss button by design: it closes itself shortly after landing,
      // and Escape or a backdrop click closes it sooner.
      if (this.dismissTimer === undefined) {
        this.dismissTimer = setTimeout(() => this.dismissConfirmation(), 2600);
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
    // Nothing is booked yet: the user reviews the details first.
    this.reviewOpen.set(true);
  }

  /** Approves the reviewed details and shows the success dialog. */
  confirmBooking(): void {
    this.animateOut(this.reviewEl()?.nativeElement, this.reviewBackdropEl()?.nativeElement, () => {
      this.reviewOpen.set(false);
      // TODO: future authenticated endpoint, explicit consent/retention review, server-side field validation, and server-authoritative availability recheck. Only show success once the server confirms.
      this.bookingSaved.set(true);
    });
  }

  cancelReview(): void {
    this.animateOut(this.reviewEl()?.nativeElement, this.reviewBackdropEl()?.nativeElement, () => {
      this.reviewOpen.set(false);
      this.submitButton()?.nativeElement.focus();
    });
  }

  closeConfirmation(): void {
    this.bookingSaved.set(false);
    this.dismissTimer = undefined;
    // Return focus to the control that opened the dialog.
    this.submitButton()?.nativeElement.focus();
  }

  /** Plays the exit animation, then removes the dialog from the DOM. */
  dismissConfirmation(): void {
    if (this.closing) {
      return;
    }
    this.closing = true;
    if (this.dismissTimer !== undefined) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }

    this.animateOut(this.confirmationEl()?.nativeElement, this.backdropEl()?.nativeElement, () => {
      this.closing = false;
      this.closeConfirmation();
    });
  }

  private animateIn(panel: HTMLElement | undefined, backdrop: HTMLElement | undefined): void {
    if (!panel || typeof panel.animate !== 'function' || this.prefersReducedMotion()) {
      return;
    }
    backdrop?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    panel.animate(
      [
        { opacity: 0, transform: 'scale(0.94) translateY(8px)' },
        { opacity: 1, transform: 'scale(1) translateY(0)' },
      ],
      { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }

  private animateOut(panel: HTMLElement | undefined, backdrop: HTMLElement | undefined, done: () => void): void {
    if (!panel || typeof panel.animate !== 'function' || this.prefersReducedMotion()) {
      done();
      return;
    }
    backdrop?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'both' });
    panel
      .animate(
        [
          { opacity: 1, transform: 'scale(1) translateY(0)' },
          { opacity: 0, transform: 'scale(0.96) translateY(6px)' },
        ],
        { duration: 180, easing: 'ease-in', fill: 'both' },
      )
      .addEventListener('finish', done, { once: true });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
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
