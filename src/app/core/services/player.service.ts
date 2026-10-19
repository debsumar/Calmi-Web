import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

export interface SoundTrack {
  /** Unique within the app. Titles may repeat across lists; identity is always the id. */
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  /** Tracks without audio are not playable yet ("Coming soon"). */
  audio?: string;
}

const DEFAULT_VOLUME = 0.7;
const SPEEDS = [1, 1.5, 2] as const;

@Injectable({ providedIn: 'root' })
export class PlayerService {
  nowPlaying = signal<SoundTrack | null>(null);
  isPlaying = signal(false);
  playlist = signal<SoundTrack[]>([]);
  currentIndex = signal(0);
  elapsed = signal(0);
  totalSeconds = signal(0);
  volume = signal(DEFAULT_VOLUME);
  speed = signal(1);
  /**
   * Repeat means repeat-one: when the current track reaches its end (or skipForward is
   * invoked at the end), the same track restarts instead of advancing the playlist.
   */
  repeat = signal(false);
  shuffle = signal(false);
  /** True when the current track has no audio source. Nothing plays and no timer runs. */
  unavailable = signal(false);
  /** Set when the browser rejects playback (autoplay policy, decode error). Cleared on next attempt. */
  playbackError = signal<string | null>(null);

  hasTrack = computed(() => !!this.nowPlaying());
  progress = computed(() => this.totalSeconds() > 0 ? (this.elapsed() / this.totalSeconds()) * 100 : 0);
  elapsedFormatted = computed(() => this.formatTime(this.elapsed()));
  remainingFormatted = computed(() => this.formatTime(this.totalSeconds() - this.elapsed()));

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private pendingSeekSeconds: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopTimer();
      this.disposeAudio();
    });
  }

  play(track: SoundTrack, list?: SoundTrack[]): void {
    this.updatePlaylist(track, list);
    this.stopTimer();
    this.disposeAudio();

    this.nowPlaying.set(track);
    this.elapsed.set(0);
    this.totalSeconds.set(this.parseDuration(track.duration));
    this.playbackError.set(null);

    if (!track.audio) {
      // No source: never fake playback.
      this.unavailable.set(true);
      this.isPlaying.set(false);
      return;
    }

    this.unavailable.set(false);
    this.isPlaying.set(true);
    const audio = this.createAudio(track.audio);
    this.audioEl = audio;
    this.attemptPlay(audio);
    this.startTimer();
  }

  togglePlayPause(): void {
    if (!this.nowPlaying() || this.unavailable()) return;

    if (this.isPlaying()) {
      this.isPlaying.set(false);
      this.stopTimer();
      this.audioEl?.pause();
      return;
    }

    const audio = this.audioEl;
    if (!audio) return;
    this.playbackError.set(null);
    this.isPlaying.set(true);
    this.startTimer();
    this.attemptPlay(audio);
  }

  skipForward(): void {
    // Repeat-one: skipping at the very end replays the current track.
    if (this.repeat() && this.nowPlaying() && this.totalSeconds() > 0 && this.elapsed() >= this.totalSeconds()) {
      this.restartCurrent();
      return;
    }
    const list = this.playlist();
    if (!list.length) return;
    const start = this.currentIndex();
    let next = this.shuffle()
      ? Math.floor(Math.random() * list.length)
      : (start + 1) % list.length;
    // Prefer the next playable track so a skip never lands on a "Coming soon" entry.
    for (let i = 0; i < list.length && !list[next].audio; i++) {
      next = (next + 1) % list.length;
    }
    if (!list[next].audio && list.some(t => !!t.audio)) return;
    this.currentIndex.set(next);
    this.play(list[next]);
  }

  skipBack(): void {
    const list = this.playlist();
    if (!list.length) return;
    let prev = (this.currentIndex() - 1 + list.length) % list.length;
    for (let i = 0; i < list.length && !list[prev].audio; i++) {
      prev = (prev - 1 + list.length) % list.length;
    }
    this.currentIndex.set(prev);
    this.play(list[prev]);
  }

  setVolume(vol: number): void {
    if (!Number.isFinite(vol)) return;
    const clamped = Math.min(1, Math.max(0, vol));
    this.volume.set(clamped);
    if (this.audioEl) this.audioEl.volume = clamped;
  }

  cycleSpeed(): void {
    const current = (SPEEDS as readonly number[]).indexOf(this.speed());
    const next = SPEEDS[(current + 1) % SPEEDS.length];
    this.speed.set(next);
    if (this.audioEl) this.audioEl.playbackRate = next;
    // Timer period is scaled by speed, so it must be re-armed.
    if (this.isPlaying()) this.startTimer();
  }

  toggleRepeat(): void {
    this.repeat.update(v => !v);
  }

  toggleShuffle(): void {
    this.shuffle.update(v => !v);
  }

  seek(percent: number): void {
    if (!this.nowPlaying() || !Number.isFinite(percent)) return;
    const clamped = Math.min(100, Math.max(0, percent));
    const time = (clamped / 100) * this.totalSeconds();
    this.elapsed.set(Math.floor(time));
    this.applyAudioPosition(time);
  }

  private updatePlaylist(track: SoundTrack, list?: SoundTrack[]): void {
    const source = list ?? this.playlist();
    const index = source.findIndex(t => t.id === track.id);
    if (index === -1) {
      this.playlist.set([track]);
      this.currentIndex.set(0);
      return;
    }
    if (list) this.playlist.set(list);
    this.currentIndex.set(index);
  }

  private createAudio(src: string): HTMLAudioElement {
    const audio = new Audio(src);
    audio.loop = true; // Always loop — we control stop via display duration
    audio.volume = this.volume();
    audio.playbackRate = this.speed();
    audio.addEventListener('loadedmetadata', () => {
      if (this.audioEl === audio && this.pendingSeekSeconds !== null) {
        const pending = this.pendingSeekSeconds;
        this.pendingSeekSeconds = null;
        this.applyAudioPosition(pending);
      }
    });
    return audio;
  }

  private attemptPlay(audio: HTMLAudioElement): void {
    let result: Promise<void> | undefined;
    try {
      result = audio.play();
    } catch {
      this.onPlaybackBlocked(audio);
      return;
    }
    result?.catch?.(() => this.onPlaybackBlocked(audio));
  }

  private onPlaybackBlocked(audio: HTMLAudioElement): void {
    if (this.audioEl !== audio) return; // Stale rejection from a previous track.
    this.isPlaying.set(false);
    this.stopTimer();
    this.playbackError.set('Playback was blocked by the browser. Press play to try again.');
  }

  private applyAudioPosition(time: number): void {
    const audio = this.audioEl;
    if (!audio) return;
    const duration = audio.duration;
    if (Number.isFinite(duration) && duration > 0) {
      audio.currentTime = time % duration;
      this.pendingSeekSeconds = null;
    } else {
      // Metadata not loaded yet: apply once it is.
      this.pendingSeekSeconds = time;
    }
  }

  private restartCurrent(): void {
    this.elapsed.set(0);
    this.pendingSeekSeconds = null;
    if (this.audioEl) {
      try { this.audioEl.currentTime = 0; } catch { /* metadata not ready; loop restarts anyway */ }
    }
    if (this.isPlaying()) this.startTimer();
  }

  private onTrackEnded(): void {
    if (this.repeat()) {
      this.restartCurrent();
    } else {
      this.skipForward();
    }
  }

  private disposeAudio(): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl = null;
    }
    this.pendingSeekSeconds = null;
  }

  private startTimer(): void {
    this.stopTimer();
    if (!this.nowPlaying() || this.unavailable() || this.totalSeconds() <= 0) return;
    // One tick = one second of *track* time, so wall-clock period shrinks with playback speed.
    const period = 1000 / (this.speed() || 1);
    this.intervalId = setInterval(() => {
      if (this.elapsed() < this.totalSeconds()) {
        this.elapsed.update(v => v + 1);
      } else {
        this.onTrackEnded();
      }
    }, period);
  }

  private stopTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Parses `mm:ss` or `h:mm:ss`. Anything else yields 0, never NaN. */
  private parseDuration(dur: string): number {
    if (typeof dur !== 'string') return 0;
    const parts = dur.trim().split(':');
    if ((parts.length !== 2 && parts.length !== 3) || parts.some(p => !/^\d+$/.test(p))) return 0;
    const nums = parts.map(Number);
    return nums.length === 3
      ? nums[0] * 3600 + nums[1] * 60 + nums[2]
      : nums[0] * 60 + nums[1];
  }

  private formatTime(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
