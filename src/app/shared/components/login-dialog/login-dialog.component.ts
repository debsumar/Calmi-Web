import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@/core/services/auth.service';

@Component({
  selector: 'app-login-dialog',
  imports: [DialogModule],
  templateUrl: './login-dialog.component.html',
})
export class LoginDialogComponent {
  authService = inject(AuthService);

  async onGoogleLogin(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.authService.closeLogin();
    } catch (err) {
      console.error('Google Sign-in failed', err);
    }
  }
}
