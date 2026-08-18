export type ChatRole = 'user' | 'ai' | 'system';
export type ChatMessageStatus = 'sent' | 'sending' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: Date;
  status: ChatMessageStatus;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
}
