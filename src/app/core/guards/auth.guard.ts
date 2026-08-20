import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { safeReturnUrl } from '../routing/safe-return-url';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restoreSession();

  if (auth.isAuthenticated()) return true;

  const returnUrl = safeReturnUrl(state.url) ?? '/home';
  return router.createUrlTree(['/auth/identify'], { queryParams: { returnUrl } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restoreSession();
  return auth.isAuthenticated() ? router.createUrlTree(['/home']) : true;
};
