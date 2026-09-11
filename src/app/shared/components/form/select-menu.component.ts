import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export interface SelectMenuOption<T extends string | number = string | number> {
  readonly value: T | null;
  readonly label: string;
}

type SelectMenuValue = string | number | null;

let nextSelectMenuId = 0;

@Component({
  selector: 'app-select-menu',
  imports: [LucideDynamicIcon],
  host: { class: 'relative block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-labelledby]="labelledBy() || null"
      [attr.aria-expanded]="isOpen()"
      aria-haspopup="listbox"
      [attr.aria-controls]="isOpen() ? listboxId : null"
      [attr.aria-activedescendant]="isOpen() ? activeOptionId() : null"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
      class="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-hairline bg-sunken px-3 text-left text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <span class="truncate">{{ selectedLabel() }}</span>
      <svg aria-hidden="true" [lucideIcon]="'chevron-down'" [size]="16" class="shrink-0 text-ink-soft transition-transform" [class.rotate-180]="isOpen()"></svg>
    </button>
    @if (isOpen()) {
      <div
        #panel
        [id]="listboxId"
        role="listbox"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-labelledby]="labelledBy() || null"
        class="absolute z-40 max-h-64 w-full overflow-y-auto rounded-2xl border border-hairline bg-elevated p-1 shadow-card"
        [class.bottom-full]="opensUpward()"
        [class.mb-2]="opensUpward()"
        [class.mt-2]="!opensUpward()">
        @for (option of options(); track $index; let index = $index) {
          <button
            type="button"
            role="option"
            tabindex="-1"
            [id]="optionId(index)"
            [attr.data-select-menu-option-index]="index"
            [attr.aria-selected]="value() === option.value"
            (mouseenter)="setActiveIndex(index)"
            (click)="choose(option.value)"
            class="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-xs text-ink transition-colors hover:bg-sunken focus-visible:outline-none"
            [class.bg-sunken]="activeOptionIndex() === index"
            [class.ring-2]="activeOptionIndex() === index"
            [class.ring-brand]="activeOptionIndex() === index"
            [class.ring-inset]="activeOptionIndex() === index"
            [class.text-brand]="value() === option.value">
            <span aria-hidden="true" class="w-4 text-center" [class.invisible]="value() !== option.value">✓</span>
            <span>{{ option.label }}</span>
          </button>
        }
      </div>
    }
  `,
})
export class SelectMenuComponent {
  readonly options = input.required<readonly SelectMenuOption[]>();
  readonly value = input<SelectMenuValue>(null);
  readonly placeholder = input('Select an option');
  readonly ariaLabel = input('');
  readonly labelledBy = input('');
  readonly valueChange = output<SelectMenuValue>();

  readonly isOpen = signal(false);
  readonly activeIndex = signal(0);
  readonly opensUpward = signal(false);
  readonly listboxId = `select-menu-listbox-${nextSelectMenuId++}`;

  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly host: ElementRef<HTMLElement>) {
    const documentRef = this.host.nativeElement.ownerDocument;
    const view = documentRef.defaultView;
    documentRef.addEventListener('click', this.onDocumentClick);
    documentRef.addEventListener('scroll', this.onDocumentScroll, true);
    view?.addEventListener('resize', this.onResize);
    this.destroyRef.onDestroy(() => {
      documentRef.removeEventListener('click', this.onDocumentClick);
      documentRef.removeEventListener('scroll', this.onDocumentScroll, true);
      view?.removeEventListener('resize', this.onResize);
      if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    });
  }

  selectedLabel(): string {
    return this.options().find((option) => option.value === this.value())?.label ?? this.placeholder();
  }

  activeOptionIndex(): number | null {
    const count = this.options().length;
    if (count === 0) return null;
    return Math.min(Math.max(this.activeIndex(), 0), count - 1);
  }

  activeOptionId(): string | null {
    const index = this.activeOptionIndex();
    return index === null ? null : this.optionId(index);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  choose(value: SelectMenuValue): void {
    this.valueChange.emit(value);
    this.close(true);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isPrintableCharacter(event)) {
      event.preventDefault();
      if (!this.isOpen()) this.open();
      this.findTypeaheadMatch(event.key);
      return;
    }

    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
          return;
        }
        if (event.key === 'ArrowDown') this.moveActive(1);
        else if (event.key === 'ArrowUp') this.moveActive(-1);
        else this.chooseActive();
        return;
      case 'Home':
        if (this.isOpen()) {
          event.preventDefault();
          this.setActiveIndex(0);
        }
        return;
      case 'End':
        if (this.isOpen()) {
          event.preventDefault();
          this.setActiveIndex(Math.max(this.options().length - 1, 0));
        }
        return;
      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          event.stopPropagation();
          this.close(true);
        }
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  };

  private readonly onResize = (): void => {
    if (this.isOpen()) this.updatePanelPosition();
  };

  private readonly onDocumentScroll = (): void => {
    if (this.isOpen()) this.updatePanelPosition();
  };

  private open(): void {
    const selectedIndex = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : 0);
    this.opensUpward.set(false);
    this.isOpen.set(true);
    this.schedulePanelUpdate();
  }

  private close(returnFocus = false): void {
    this.isOpen.set(false);
    this.typeahead = '';
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = undefined;
    if (returnFocus) queueMicrotask(() => this.triggerRef()?.nativeElement.focus());
  }

  private chooseActive(): void {
    const index = this.activeOptionIndex();
    if (index === null) return;
    this.choose(this.options()[index]?.value ?? null);
  }

  private moveActive(change: number): void {
    const optionCount = this.options().length;
    if (optionCount === 0) return;
    const current = this.activeOptionIndex() ?? 0;
    this.setActiveIndex((current + change + optionCount) % optionCount);
  }

  setActiveIndex(index: number): void {
    this.activeIndex.set(index);
    if (this.isOpen()) this.schedulePanelUpdate();
  }

  private findTypeaheadMatch(character: string): void {
    this.typeahead += character.toLocaleLowerCase();
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => {
      this.typeahead = '';
      this.typeaheadTimer = undefined;
    }, 700);

    const match = this.options().findIndex((option) => option.label.toLocaleLowerCase().startsWith(this.typeahead));
    if (match >= 0) this.setActiveIndex(match);
  }

  private isPrintableCharacter(event: KeyboardEvent): boolean {
    return event.key.length === 1 && event.key !== ' ' && !event.altKey && !event.ctrlKey && !event.metaKey;
  }

  private schedulePanelUpdate(): void {
    afterNextRender(() => {
      this.updatePanelPosition();
      this.scrollActiveOptionIntoView();
    }, { injector: this.injector });
  }

  private scrollActiveOptionIntoView(): void {
    const index = this.activeOptionIndex();
    const panel = this.panelRef()?.nativeElement;
    if (index === null || !panel) return;
    const option = panel.querySelector<HTMLElement>(`[data-select-menu-option-index="${index}"]`);
    option?.scrollIntoView?.({ block: 'nearest' });
  }

  private updatePanelPosition(): void {
    const trigger = this.triggerRef()?.nativeElement;
    const panel = this.panelRef()?.nativeElement;
    const view = this.host.nativeElement.ownerDocument.defaultView;
    if (!trigger || !panel || !view) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelHeight = panel.getBoundingClientRect().height;
    const spaceBelow = view.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    this.opensUpward.set(panelHeight > spaceBelow && spaceAbove > spaceBelow);
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }
}
