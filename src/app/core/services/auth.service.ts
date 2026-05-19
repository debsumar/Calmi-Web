import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  showLoginDialog = signal(false);

  openLogin(): void {
    this.showLoginDialog.set(true);
  }

  closeLogin(): void {
    this.showLoginDialog.set(false);
  }
}
