import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { LoginDialogComponent } from '@/shared/components/login-dialog/login-dialog.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppTopbar, LoginDialogComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[#f5f3f0] dark:bg-[#090514]">
      <app-topbar class="sticky top-0 z-50 w-full" />
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
    <app-login-dialog />
  `,
})
export class AppLayout {}
