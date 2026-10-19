import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LoaderService } from '@/core/services/loader.service';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-loader',
  imports: [ProgressSpinner],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (loader.loading()) {
      <div role="status" aria-live="polite" aria-label="Loading" class="fixed inset-0 z-40 flex items-center justify-center bg-glass backdrop-blur-sm">
        <p-progress-spinner />
      </div>
    }
  `,
})
export class LoaderComponent {
  loader = inject(LoaderService);
}
