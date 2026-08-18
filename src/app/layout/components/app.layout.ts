import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { LoginDialogComponent } from '@/shared/components/login-dialog/login-dialog.component';
import { ChatWidgetComponent } from '@/features/chat/chat-widget.component';
import { ScrollPositionService } from '@/core/services/scroll-position.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppTopbar, LoginDialogComponent, ChatWidgetComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div id="calmi-app-shell" class="min-h-screen flex flex-col bg-canvas">
      <app-topbar class="sticky top-0 z-50 w-full" />
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
    <app-chat-widget />
    <app-login-dialog />
  `,
})
export class AppLayout {
  private readonly _ = inject(ScrollPositionService);
}
