import { describe, expect, it } from 'vitest';
import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  it('registers Download as a lazy public shell child with a page title', () => {
    const shellRoute = appRoutes.find((route) => route.path === '');
    const downloadRoute = shellRoute?.children?.find((route) => route.path === 'download');

    expect(downloadRoute?.loadComponent).toBeTypeOf('function');
    expect(downloadRoute?.title).toBe('Download Calmi App | Calmi');
  });

  it('registers Journal as a lazy public shell child with a page title', () => {
    const shellRoute = appRoutes.find((route) => route.path === '');
    const journalRoute = shellRoute?.children?.find((route) => route.path === 'journal');

    expect(journalRoute?.loadComponent).toBeTypeOf('function');
    expect(journalRoute?.title).toBe('Journal | Calmi');
  });

  it('redirects legacy /therapy URLs and /sessions to /experts', () => {
    const shellRoute = appRoutes.find((route) => route.path === '');
    const children = shellRoute?.children ?? [];
    const redirectOf = (path: string) => children.find((route) => route.path === path);

    expect(redirectOf('therapy/wellness-quiz')).toMatchObject({ redirectTo: 'experts/wellness-quiz', pathMatch: 'full' });
    expect(redirectOf('therapy/:id')).toMatchObject({ redirectTo: 'experts/:id', pathMatch: 'full' });
    expect(redirectOf('therapy')).toMatchObject({ redirectTo: 'experts', pathMatch: 'full' });
    expect(redirectOf('sessions')).toMatchObject({ redirectTo: 'experts', pathMatch: 'full' });
  });

  it('registers the real expert routes after their legacy redirects', () => {
    const shellRoute = appRoutes.find((route) => route.path === '');
    const paths = (shellRoute?.children ?? []).map((route) => route.path);

    expect(paths.indexOf('experts/wellness-quiz')).toBeGreaterThan(paths.indexOf('therapy/wellness-quiz'));
    expect(paths.indexOf('experts/:id')).toBeGreaterThan(paths.indexOf('experts/wellness-quiz'));
    expect(paths.indexOf('experts')).toBeGreaterThan(paths.indexOf('experts/:id'));
    expect(paths.indexOf('therapy/:id')).toBeGreaterThan(paths.indexOf('therapy/wellness-quiz'));
  });
});
