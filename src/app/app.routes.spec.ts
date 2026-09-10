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
});
