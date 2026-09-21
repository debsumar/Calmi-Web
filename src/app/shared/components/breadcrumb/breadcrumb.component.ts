import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, LucideArrowLeft, AnimateOnScrollDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (animate()) {
      <nav appAnimateOnScroll [style.--index]="animationIndex()" aria-label="Breadcrumb" [class]="navClass()">
        <ng-container [ngTemplateOutlet]="trail" />
      </nav>
    } @else {
      <nav aria-label="Breadcrumb" [class]="navClass()">
        <ng-container [ngTemplateOutlet]="trail" />
      </nav>
    }

    <ng-template #trail>
      <ol class="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <li>
          <a [routerLink]="backLink()" [fragment]="fragment()"
             class="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-brand-dark dark:text-brand-light transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
            <svg lucideArrowLeft [size]="16" aria-hidden="true"></svg>
            <span>{{ backLabel() }}</span>
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page">{{ currentPage() }}</li>
      </ol>
    </ng-template>
  `,
})
export class BreadcrumbComponent {
  readonly backLink = input.required<string | readonly string[]>();
  readonly backLabel = input.required<string>();
  readonly currentPage = input.required<string>();
  readonly fragment = input<string | undefined>();
  readonly navClass = input('');
  readonly animate = input(false);
  readonly animationIndex = input(0);
}
