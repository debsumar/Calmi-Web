import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);
  loader.show();
  // finalize runs exactly once per subscription: complete, error, or unsubscribe (cancel).
  return next(req).pipe(finalize(() => loader.hide()));
};
