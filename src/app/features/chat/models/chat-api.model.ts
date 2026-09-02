export interface ChatStreamRequest {
  session_id: string;
  message: string;
  model_key: string;
  mode: string;
  knowledge: string;
  top_k: number;
  rerank: boolean;
  embedding_profile: string;
  response_length: string;
  verbatim_turns: number;
  temperature: number;
  system_prompt: string;
  tools_enabled: boolean;
  enabled_tools: readonly string[];
}

export interface ChatLatency {
  stt_ms: number;
  eou_ms: number;
  rag_ms: number;
  llm_ttft_ms: number;
  llm_total_ms: number;
  tool_ms: number;
  tts_ms: number;
  total_ms: number;
}

export interface RagQueryRequest {
  query: string;
  k: number;
  rerank: boolean;
  profile: string;
}

export interface RagChunk {
  id: string;
  doc: string;
  heading: string;
  text: string;
  preview: string;
  score: number;
  rank: number;
}

export interface RagQueryLatency {
  embed_ms: number;
  search_ms: number;
  rerank_ms: number;
  rag_ms: number;
}

export interface RagQueryMeta {
  profile: string;
  model: string;
  k: number;
  reranked: boolean;
  pool: number;
  cache: {
    hits: number;
    misses: number;
    size: number;
  };
}

export interface RagQueryResponse {
  chunks: RagChunk[];
  context: string;
  latency: RagQueryLatency;
  meta: RagQueryMeta;
  query_point: { x: number; y: number };
  retrieved_ids: string[];
  would_retrieve: boolean;
}

export interface ChatKnowledgeMeta {
  mode: string;
  skipped?: string;
  chunks?: number;
  sources?: readonly string[];
  profile?: string;
  model?: string;
  k?: number;
  reranked?: boolean;
  pool?: number;
  cache?: Readonly<Record<string, unknown>>;
  embed_ms?: number;
  search_ms?: number;
  rerank_ms?: number;
  rag_ms?: number;
}

export interface ChatDoneMeta {
  model?: string;
  model_key?: string;
  provider?: string;
  mode?: string;
  knowledge?: ChatKnowledgeMeta;
  routing?: string;
  verbatim_messages?: number;
  summarized_messages?: number;
  summary_used?: boolean;
  system_chars?: number;
  tools_advertised?: readonly string[];
  tool_calls?: readonly ChatToolCall[];
}

export interface ChatToolCall {
  name?: string;
  arguments?: Readonly<Record<string, unknown>>;
  result?: unknown;
}

export interface ChatDeltaEvent {
  readonly type: 'delta';
  readonly text: string;
}

export interface ChatDoneEvent {
  readonly type: 'done';
  readonly latency?: ChatLatency;
  readonly meta?: ChatDoneMeta;
}

export interface ChatErrorEvent {
  readonly type: 'error';
  readonly message: string;
  readonly status?: number;
  readonly aborted?: boolean;
}

export type ChatStreamEvent = ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent;

export interface ChatStreamHandle {
  readonly completed: Promise<void>;
  cancel(): void;
}

export interface VoiceToken {
  token: string;
  url: string;
  room?: string;
  identity?: string;
}

export interface VoiceTokenErrorDetails {
  status?: number;
  responseBody?: string;
}

export class VoiceTokenError extends Error {
  readonly status?: number;
  readonly responseBody?: string;

  constructor(message: string, details: VoiceTokenErrorDetails = {}) {
    super(message);
    this.name = 'VoiceTokenError';
    this.status = details.status;
    this.responseBody = details.responseBody;
  }
}


export interface RagQueryErrorDetails {
  status?: number;
  responseBody?: string;
}

export class RagQueryError extends Error {
  readonly status?: number;
  readonly responseBody?: string;

  constructor(message: string, details: RagQueryErrorDetails = {}) {
    super(message);
    this.name = 'RagQueryError';
    this.status = details.status;
    this.responseBody = details.responseBody;
  }
}
