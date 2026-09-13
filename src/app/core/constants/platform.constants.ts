export const PLATFORM = {
  WEB: 1,
  ANDROID: 2,
  IOS: 3,
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];
