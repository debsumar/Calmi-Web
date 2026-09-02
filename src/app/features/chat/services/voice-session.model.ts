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
  | 'connection-error'
  | 'device-error'
  | 'unsupported'
  | (string & {});

export interface VoiceSessionError {
  code: VoiceSessionRecognitionErrorCode;
  message: string;
}

export interface VoiceTranscriptSegment {
  id: string;
  text: string;
  final: boolean;
  speaker: 'user' | 'agent';
}

export type VoiceRoomErrorCode = 'unsupported' | 'connection-error' | 'device-error' | 'unexpected-disconnect';

export interface VoiceRoomError {
  code: VoiceRoomErrorCode;
  message: string;
}

/** Identifies the mounted chat surface that owns the voice overlay. */
export type ChatConversationSurface = 'floating-panel' | 'rumi-embedded';
export type ChatConversationVariant = 'panel' | 'embedded';
