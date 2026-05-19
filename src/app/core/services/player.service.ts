import { Injectable, signal, computed } from '@angular/core';

export interface SoundTrack {
  title: string;
  description: string;
  duration: string;
  image: string;
  audio?: string;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  nowPlaying = signal<SoundTrack | null>(null);
  isPlaying = signal(false);
  playlist = signal<SoundTrack[]>([]);
  currentIndex = signal(0);
  elapsed = signal(0);
  totalSeconds = signal(0);
  volume = signal(0.7);
  speed = signal(1);
  repeat = signal(false);
  shuffle = signal(false);

  hasTrack = computed(() => !!this.nowPlaying());
  progress = computed(() => this.totalSeconds() > 0 ? (this.elapsed() / this.totalSeconds()) * 100 : 0);
  elapsedFormatted = computed(() => this.formatTime(this.elapsed()));
  remainingFormatted = computed(() => this.formatTime(this.totalSeconds() - this.elapsed()));

  private intervalId: any = null;
  private audioEl: HTMLAudioElement | null = null;

  play(track: SoundTrack, list?: SoundTrack[]): void {
    if (list) {
      this.playlist.set(list);
      this.currentIndex.set(list.findIndex(t => t.title === track.title));
    }
    this.nowPlaying.set(track);
    this.elapsed.set(0);
    this.isPlaying.set(true);
    this.playAudio(track.audio);
  }

  togglePlayPause(): void {
    this.isPlaying.update(v => !v);
    if (this.isPlaying()) {
      this.startTimer();
      this.audioEl?.play();
    } else {
      this.stopTimer();
      this.audioEl?.pause();
    }
  }

  skipForward(): void {
    const list = this.playlist();
    if (!list.length) return;
    let next: number;
    if (this.shuffle()) {
      next = Math.floor(Math.random() * list.length);
    } else {
      next = (this.currentIndex() + 1) % list.length;
    }
    this.currentIndex.set(next);
    this.play(list[next]);
  }

  skipBack(): void {
    const list = this.playlist();
    if (!list.length) return;
    const prev = (this.currentIndex() - 1 + list.length) % list.length;
    this.currentIndex.set(prev);
    this.play(list[prev]);
  }

  setVolume(vol: number): void {
    this.volume.set(vol);
    if (this.audioEl) this.audioEl.volume = vol;
  }

  cycleSpeed(): void {
    const speeds = [1, 1.5, 2];
    const current = speeds.indexOf(this.speed());
    this.speed.set(speeds[(current + 1) % speeds.length]);
    if (this.audioEl) this.audioEl.playbackRate = this.speed();
  }

  toggleRepeat(): void {
    this.repeat.update(v => !v);
    if (this.audioEl) this.audioEl.loop = this.repeat();
  }

  toggleShuffle(): void {
    this.shuffle.update(v => !v);
  }

  seek(percent: number): void {
    const time = (percent / 100) * this.totalSeconds();
    this.elapsed.set(Math.floor(time));
    if (this.audioEl) {
      this.audioEl.currentTime = time;
    }
  }

  private playAudio(src?: string): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl = null;
    }
    this.stopTimer();
    if (src) {
      this.audioEl = new Audio(src);
      this.audioEl.loop = this.repeat();
      this.audioEl.volume = this.volume();
      this.audioEl.playbackRate = this.speed();
      this.audioEl.addEventListener('loadedmetadata', () => {
        this.totalSeconds.set(Math.floor(this.audioEl!.duration));
        this.startTimer();
      });
      this.audioEl.addEventListener('ended', () => {
        if (!this.repeat()) this.skipForward();
      });
      this.audioEl.play().catch(() => {});
    } else {
      // No audio file — use duration from data
      const track = this.nowPlaying();
      if (track) this.totalSeconds.set(this.parseDuration(track.duration));
      this.startTimer();
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.intervalId = setInterval(() => {
      if (this.elapsed() < this.totalSeconds()) {
        this.elapsed.update(v => v + 1);
      } else {
        this.skipForward();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private parseDuration(dur: string): number {
    const parts = dur.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + (parts[1] || 0);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
