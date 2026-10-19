import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoaderService } from '../services/loader.service';
import { loaderInterceptor } from './loader.interceptor';

describe('loaderInterceptor + LoaderService counter', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let loader: LoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([loaderInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    loader = TestBed.inject(LoaderService);
  });

  afterEach(() => controller.verify({ ignoreCancelled: true }));

  it('shows while a request is pending and hides on completion', () => {
    expect(loader.loading()).toBe(false);
    http.get('/a').subscribe();
    expect(loader.loading()).toBe(true);
    controller.expectOne('/a').flush({});
    expect(loader.loading()).toBe(false);
  });

  it('hides only when the last of several concurrent requests finishes', () => {
    http.get('/a').subscribe();
    http.get('/b').subscribe();
    controller.expectOne('/a').flush({});
    expect(loader.loading()).toBe(true);
    controller.expectOne('/b').flush({});
    expect(loader.loading()).toBe(false);
  });

  it('decrements exactly once on error', () => {
    http.get('/a').subscribe({ error: () => undefined });
    http.get('/b').subscribe();
    controller.expectOne('/a').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(loader.loading()).toBe(true); // /b still pending: a double decrement would have hidden it
    controller.expectOne('/b').flush({});
    expect(loader.loading()).toBe(false);
  });

  it('decrements exactly once when a request is cancelled by unsubscribing', () => {
    const cancelled = http.get('/a').subscribe();
    http.get('/b').subscribe();
    cancelled.unsubscribe();
    expect(loader.loading()).toBe(true);
    controller.expectOne('/b').flush({});
    expect(loader.loading()).toBe(false);
  });

  it('never goes negative on an unbalanced hide()', () => {
    loader.hide();
    loader.show();
    expect(loader.loading()).toBe(true);
    loader.hide();
    expect(loader.loading()).toBe(false);
  });
});
