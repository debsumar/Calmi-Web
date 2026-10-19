import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Logs sanitised diagnostics only. HttpErrorResponse bodies, urls, headers and arbitrary
 * error payloads may contain tokens or personal data (e.g. emails), so they are never logged.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error('Unhandled error:', sanitizeError(error));
  }
}

export function sanitizeError(error: unknown): { name: string; status?: number; message: string } {
  if (error instanceof HttpErrorResponse) {
    // error.message embeds the request url; use a fixed string instead.
    return { name: 'HttpErrorResponse', status: error.status, message: 'HTTP request failed' };
  }
  if (error instanceof Error) {
    return { name: error.name, message: redact(error.message) };
  }
  return { name: 'UnknownError', message: 'Non-Error value thrown' };
}

function redact(message: string): string {
  return message
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted-email]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .slice(0, 300);
}
