import { describe, expect, it } from 'vitest';
import { resolveHttpsAvatarUrl, resolveUserAvatarUrl } from './avatar-url';

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

describe('avatar fallback chain', () => {
  it('skips an empty avatar_url and uses picture', () => {
    expect(resolveHttpsAvatarUrl({ avatar_url: '', picture: 'https://cdn.example.com/p.png' })).toBe('https://cdn.example.com/p.png');
  });

  it('skips an unsafe avatar_url and uses picture', () => {
    expect(resolveHttpsAvatarUrl({ avatar_url: 'javascript:alert(1)', picture: 'https://cdn.example.com/p.png' }))
      .toBe('https://cdn.example.com/p.png');
  });

  it('falls through user_metadata to the first valid identity avatar', () => {
    const url = resolveUserAvatarUrl({
      user_metadata: { avatar_url: 'http://insecure.example/p.png' },
      identities: [
        { identity_data: { avatar_url: '' } },
        { identity_data: { picture: 'https://cdn.example.com/identity.png' } },
        { identity_data: { avatar_url: 'https://cdn.example.com/later.png' } },
      ],
    });
    expect(url).toBe('https://cdn.example.com/identity.png');
  });

  it('prefers user_metadata when it is valid', () => {
    expect(resolveUserAvatarUrl({
      user_metadata: { avatar_url: 'https://cdn.example.com/meta.png' },
      identities: [{ identity_data: { avatar_url: 'https://cdn.example.com/identity.png' } }],
    })).toBe('https://cdn.example.com/meta.png');
  });

  it('returns null with no user or no valid source', () => {
    expect(resolveUserAvatarUrl(null)).toBeNull();
    expect(resolveUserAvatarUrl({ user_metadata: {}, identities: [{ identity_data: { avatar_url: 'data:x' } }] })).toBeNull();
  });
});
