import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const FALLBACK_ORIGIN = 'http://localhost';

function isTrustedApiRequest(requestUrl: string): boolean {
  const origin = typeof window === 'undefined' ? FALLBACK_ORIGIN : window.location.origin;

  try {
    const request = new URL(requestUrl, origin);
    const api = new URL(environment.apiUrl, origin);
    const apiPath = api.pathname.replace(/\/+$/, '') || '/';

    if (request.origin !== api.origin) return false;
    return apiPath === '/'
      ? request.pathname.startsWith('/')
      : request.pathname === apiPath || request.pathname.startsWith(`${apiPath}/`);
  } catch {
    return false;
  }
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).accessToken();
  if (token && isTrustedApiRequest(req.url)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
