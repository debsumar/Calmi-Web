import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LoaderService } from '@/core/services/loader.service';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-loader',
  imports: [ProgressSpinner],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (loader.loading()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/50">
        <p-progress-spinner />
      </div>
    }
  `,
})
export class LoaderComponent {
  loader = inject(LoaderService);
}
