import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthRole, AuthService } from '@/core/services/auth.service';
import { AuthSplitCardComponent } from '@/shared/components/auth-split-card/auth-split-card.component';

interface RoleOption {
  value: AuthRole;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-identification',
  imports: [AuthSplitCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-split-card
      imageSrc="/assets/meditation.svg"
      imageAlt="Two people seated calmly together in meditation"
      imageSide="left">
      <div class="mx-auto flex w-full max-w-md flex-col">
        <h1 class="text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">Get Started with Calmi</h1>
        <p class="mt-3 text-base leading-relaxed text-ink-soft">Pick the account type that matches how you'll use Calmi.</p>

        <div class="mt-8 space-y-3" role="radiogroup" aria-label="Account type">
          @for (option of roleOptions; track option.value; let index = $index) {
            <button
              #roleButton
              type="button"
              role="radio"
              [attr.aria-checked]="selectedRole() === option.value"
              [attr.tabindex]="focusedIndex() === index ? 0 : -1"
              (click)="selectRole(option.value, index)"
              (keydown)="onRoleKeydown($event, index)"
              class="flex w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              [class.border-brand]="selectedRole() === option.value"
              [class.bg-brand-soft\/10]="selectedRole() === option.value"
              [class.border-hairline]="selectedRole() !== option.value">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-deep" aria-hidden="true">
                @if (option.value === 'specialist') {
                  <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-3.4 3-5.2 6.5-5.2s5.8 1.8 6.5 5.2"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-3.4 3-5.2 6.5-5.2s5.8 1.8 6.5 5.2"/></svg>
                }
              </span>
              <span class="min-w-0">
                <span class="block text-base font-bold text-ink">{{ option.title }}</span>
                <span class="mt-1 block text-sm text-ink-muted">If this is you, kindly select and proceed</span>
              </span>
            </button>
          }
        </div>

        <button
          type="button"
          [disabled]="!selectedRole()"
          [attr.aria-disabled]="!selectedRole() ? 'true' : null"
          (click)="proceed()"
          class="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-brand-deep px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted">
          Proceed
          <span class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
          </span>
        </button>
      </div>
    </app-auth-split-card>
  `,
})
export class IdentificationComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  @ViewChildren('roleButton') private readonly roleButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly roleOptions: readonly RoleOption[] = [
    { value: 'specialist', title: 'Wellness Specialist', icon: 'specialist' },
    { value: 'user', title: 'User', icon: 'user' },
  ];
  readonly selectedRole = signal<AuthRole | null>(null);
  readonly focusedIndex = signal(0);

  selectRole(role: AuthRole, index: number): void {
    this.selectedRole.set(role);
    this.focusedIndex.set(index);
  }

  onRoleKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectRole(this.roleOptions[index].value, index);
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'ArrowUp' || event.key === 'ArrowLeft'
      ? (index + this.roleOptions.length - 1) % this.roleOptions.length
      : (index + 1) % this.roleOptions.length;
    this.selectRole(this.roleOptions[nextIndex].value, nextIndex);
    this.roleButtons?.get(nextIndex)?.nativeElement.focus();
  }

  proceed(): void {
    const role = this.selectedRole();
    if (!role) return;
    this.authService.selectedRole.set(role);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigate(['/auth/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
  }
}
