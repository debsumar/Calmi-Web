import { ChatMessage } from '@/features/chat/models/chat-message.model';


export type RumiIcon = 'heart' | 'leaf' | 'lightbulb';
export interface RumiHelpCard {
  id: string;
  icon: RumiIcon;
  title: string;
  description: string;
}

export const RUMI_HERO_BULLETS = [
  'Always here to listen',
  'Private and judgment free',
  'Evidence-based guidance',
] as const;

export const RUMI_HELP_CARDS: RumiHelpCard[] = [
  {
    id: 'talk-it-out',
    icon: 'heart',
    title: 'Talk it out',
    description: 'Share whatever is on your mind without any judgment.',
  },
  {
    id: 'feel-better',
    icon: 'leaf',
    title: 'Feel better',
    description: 'Get simple, science-backed techniques to manage difficult emotions.',
  },
  {
    id: 'gain-perspective',
    icon: 'lightbulb',
    title: 'Gain perspective',
    description: 'Reflect and understand your thoughts, patterns and emotions.',
  },
];

/** Icon-tile tint per topic; classes stay literal so Tailwind can scan them. */
export interface RumiSupportTopic {
  id: string;
  icon: 'brain' | 'sprout' | 'hand-heart' | 'moon';
  tileClass: string;
  title: string;
  description: string;
  /** Seeds the chat composer so the panel opens mid-conversation, not blank. */
  prompt: string;
}

/** Marketing preview of a Rumi conversation. Fixed calendar date + clock times
 *  keep both the rendered label and the `datetime` attribute deterministic. */
export function createRumiPreviewMessages(): ChatMessage[] {
  const at = (hour: number, minute: number): Date => new Date(2024, 0, 1, hour, minute, 0, 0);

  return [
    {
      id: 'preview-1',
      role: 'user',
      text: 'I’ve been feeling overwhelmed lately. Everything feels like too much.',
      timestamp: at(10, 21),
      status: 'sent',
    },
    {
      id: 'preview-2',
      role: 'ai',
      text: 'I’m really sorry that you’re feeling this way. That sounds exhausting. Want to tell what’s been weighing on your mind?',
      timestamp: at(10, 22),
      status: 'sent',
    },
    {
      id: 'preview-3',
      role: 'user',
      text: 'I just can’t seem to relax no matter what I try.',
      timestamp: at(10, 24),
      status: 'sent',
    },
    {
      id: 'preview-4',
      role: 'ai',
      text: 'That sounds exhausting. When you’ve tried everything and still can’t switch off, it can be hard to know what’s actually keeping your mind busy.',
      timestamp: at(10, 25),
      status: 'sent',
    },
  ];
}

export interface RumiTrustPoint {
  id: string;
  icon: 'lock' | 'brain' | 'clock' | 'user-circle';
  title: string;
  description: string;
}

export const RUMI_TRUST_POINTS: RumiTrustPoint[] = [
  {
    id: 'private-secure',
    icon: 'lock',
    title: 'Private & Secure',
    description: 'Your conversations are private and never shared.',
  },
  {
    id: 'backed-by-science',
    icon: 'brain',
    title: 'Backed by Science',
    description: 'Rumi uses proven psychological techniques to support you.',
  },
  {
    id: 'available-anytime',
    icon: 'clock',
    title: 'Available Anytime',
    description: 'Day or night, Rumi is here whenever you need it.',
  },
  {
    id: 'made-for-you',
    icon: 'user-circle',
    title: 'Made for You',
    description: 'Rumi adapts to you and your unique journey.',
  },
];

export const RUMI_SUPPORT_TOPICS: RumiSupportTopic[] = [
  {
    id: 'anxiety-relief',
    icon: 'brain',
    tileClass: 'bg-brand text-white',
    title: 'Anxiety relief',
    description: 'Calm anxious thoughts and reduce worry.',
    prompt: 'I would like help calming anxious thoughts.',
  },
  {
    id: 'stress-management',
    icon: 'sprout',
    tileClass: 'bg-accent-green text-white',
    title: 'Stress management',
    description: 'Manage stress and find your balance.',
    prompt: 'I am feeling stressed and want to find some balance.',
  },
  {
    id: 'low-mood-support',
    icon: 'hand-heart',
    tileClass: 'bg-accent-coral text-on-coral',
    title: 'Low-mood support',
    description: 'Gentle support for days that feel heavy.',
    prompt: 'Today feels heavy and I could use some gentle support.',
  },
  {
    id: 'sleep-troubles',
    icon: 'moon',
    tileClass: 'bg-accent-gold text-ink',
    title: 'Sleep troubles',
    description: 'Relax, unwind your mind to sleep better.',
    prompt: 'I am having trouble sleeping and want to unwind.',
  },
];
