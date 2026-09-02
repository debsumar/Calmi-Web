import { ChatDoneMeta, ChatLatency, RagQueryResponse } from './chat-api.model';

export type ChatRole = 'user' | 'ai' | 'system';
export type ChatMessageStatus = 'sent' | 'sending' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: Date;
  status: ChatMessageStatus;
  source?: 'text' | 'voice';
  latency?: ChatLatency;
  meta?: ChatDoneMeta;
  rag?: RagQueryResponse;
  ragError?: string;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
}
