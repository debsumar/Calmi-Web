import { ChatMessage, SuggestedPrompt } from '../models/chat-message.model';

/**
 * Built per call so the greeting carries the user's current local time instead
 * of a baked-in date.
 */
export function createGreetingMessages(): ChatMessage[] {
  const now = new Date();

  return [
    {
      id: 'greeting-disclaimer',
      role: 'system',
      text: 'I am here to listen anytime.',
      timestamp: now,
      status: 'sent',
    },
    {
      id: 'greeting-welcome',
      role: 'ai',
      text: 'Hi, I’m here with you. What would feel supportive to talk through today?',
      timestamp: now,
      status: 'sent',
    },
  ];
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: 'prompt-anxious', label: 'I feel anxious' },
  { id: 'prompt-sleep', label: 'Help me sleep' },
  { id: 'prompt-breathing', label: 'Guide a breathing exercise' },
];

export const CANNED_REPLIES: string[] = [
  'That sounds like a lot to carry. We can take it one small moment at a time.',
  'I’m glad you shared that. Let’s gently notice what you need right now.',
  'You do not have to solve everything at once. A slow breath can be a kind first step.',
  'Thank you for checking in with yourself. What feels most manageable in this moment?',
  'I’m here to listen. We can make space for whatever is present without rushing it.',
];

export function pickReply(userText: string): string {
  const normalizedText = userText.trim().toLowerCase();

  if (normalizedText.includes('sleep') || normalizedText.includes('tired')) {
    return CANNED_REPLIES[2];
  }
  if (normalizedText.includes('anxious') || normalizedText.includes('anxiety') || normalizedText.includes('worry')) {
    return CANNED_REPLIES[0];
  }
  if (normalizedText.includes('breathe') || normalizedText.includes('breathing')) {
    return CANNED_REPLIES[1];
  }

  const hash = Array.from(normalizedText).reduce((total, character) => total + character.charCodeAt(0), 0);
  return CANNED_REPLIES[hash % CANNED_REPLIES.length];
}
