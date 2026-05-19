import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@/core/services/auth.service';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';

@Component({
  selector: 'app-login-dialog',
  imports: [DialogModule, PrimaryButtonComponent],
  templateUrl: './login-dialog.component.html',
})
export class LoginDialogComponent {
  authService = inject(AuthService);

  onSubmit(): void {
    // TODO: implement login
    this.authService.closeLogin();
  }
}
