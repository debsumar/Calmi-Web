import { describe, expect, it } from 'vitest';
import { resolveHttpsAvatarUrl } from './avatar-url';

describe('resolveHttpsAvatarUrl', () => {
  it('accepts an https avatar_url', () => {
    expect(resolveHttpsAvatarUrl({ avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg' }))
      .toBe('https://lh3.googleusercontent.com/a/photo.jpg');
  });

  it('falls back to the picture claim', () => {
    expect(resolveHttpsAvatarUrl({ picture: 'https://cdn.example.com/p.png' })).toBe('https://cdn.example.com/p.png');
  });

  it.each([
    undefined,
    null,
    {},
    { avatar_url: '   ' },
    { avatar_url: 'javascript:alert(1)' },
    { avatar_url: 'http://insecure.example/p.png' },
    { avatar_url: 'data:image/png;base64,AAA' },
    { avatar_url: 'not a url' },
    { avatar_url: 42 },
  ])('rejects unsafe or missing metadata %j', (metadata) => {
    expect(resolveHttpsAvatarUrl(metadata as Record<string, unknown> | null | undefined)).toBeNull();
  });
});
