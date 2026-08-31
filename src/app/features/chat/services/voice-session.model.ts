export type VoiceSessionPhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type VoiceSessionRecognitionErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'audio-capture'
  | 'aborted'
  | 'network'
  | 'no-speech'
  | 'language-not-supported'
  | 'phrases-not-supported'
  | 'bad-grammar'
  | 'start-failure'
  | 'recognition-error'
  | (string & {});

export interface VoiceSessionError {
  code: VoiceSessionRecognitionErrorCode;
  message: string;
}

/** Identifies the mounted chat surface that owns the voice overlay. */
export type ChatConversationSurface = 'floating-panel' | 'rumi-embedded';
export type ChatConversationVariant = 'panel' | 'embedded';

export interface VoiceSessionAdapterCallbacks {
  onTranscript: (transcript: string) => void;
  onTurnEnd: () => void;
  onError: (code: VoiceSessionRecognitionErrorCode) => void;
}
