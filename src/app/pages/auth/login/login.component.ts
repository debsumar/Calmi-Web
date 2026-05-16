import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="p-8 border border-surface-200 rounded-xl bg-surface-0 w-full max-w-md">
        <h1 class="text-2xl font-bold text-center mb-6">Sign In</h1>
        <p class="text-surface-500 text-center">Login form goes here.</p>
      </div>
    </div>
  `,
})
export class LoginComponent {}
