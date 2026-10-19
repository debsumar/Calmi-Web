import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerService, SoundTrack } from './player.service';

class FakeAudio {
  static instances: FakeAudio[] = [];
  static playImpl: () => Promise<void> = () => Promise.resolve();
  loop = false;
  volume = 1;
  playbackRate = 1;
  duration = NaN;
  currentTime = 0;
  paused = true;
  private listeners = new Map<string, () => void>();
  constructor(public src: string) { FakeAudio.instances.push(this); }
  play = vi.fn(() => { this.paused = false; return FakeAudio.playImpl(); });
  pause = vi.fn(() => { this.paused = true; });
  addEventListener(name: string, cb: () => void): void { this.listeners.set(name, cb); }
  emit(name: string): void { this.listeners.get(name)?.(); }
}

const rain: SoundTrack = { id: 'rain', title: 'Rain', description: '', duration: '0:03', image: '', audio: 'rain.mp3' };
const ocean: SoundTrack = { id: 'ocean', title: 'Ocean', description: '', duration: '1:00:00', image: '', audio: 'ocean.mp3' };
const soon: SoundTrack = { id: 'soon', title: 'Soon', description: '', duration: '10:00', image: '' };
const rainTwin: SoundTrack = { ...rain, id: 'rain-2' }; // same title, different id

describe('PlayerService', () => {
  let player: PlayerService;
  const flush = () => Promise.resolve().then(() => Promise.resolve());

  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudio.instances = [];
    FakeAudio.playImpl = () => Promise.resolve();
    vi.stubGlobal('Audio', FakeAudio);
    player = TestBed.inject(PlayerService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('duration parsing', () => {
    it.each([
      ['45:00', 2700], ['0:03', 3], ['1:00:00', 3600], ['1:02:03', 3723],
      ['', 0], ['abc', 0], ['12', 0], ['1:xx', 0], ['-1:00', 0], ['1:2:3:4', 0], [':', 0],
    ])('parses %j as %d seconds, never NaN', (input, expected) => {
      player.play({ ...rain, duration: input, audio: undefined });
      expect(player.totalSeconds()).toBe(expected);
      expect(Number.isNaN(player.totalSeconds())).toBe(false);
    });
  });

  describe('tracks without audio', () => {
    it('never fake-plays: no timer, isPlaying false, unavailable true', () => {
      player.play(soon);
      expect(player.isPlaying()).toBe(false);
      expect(player.unavailable()).toBe(true);
      expect(player.nowPlaying()).toBe(soon);
      vi.advanceTimersByTime(5000);
      expect(player.elapsed()).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
      expect(FakeAudio.instances).toHaveLength(0);
    });

    it('togglePlayPause stays stopped on an unavailable track', () => {
      player.play(soon);
      player.togglePlayPause();
      expect(player.isPlaying()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('skipForward prefers the next playable track', () => {
      player.play(rain, [rain, soon, ocean]);
      player.skipForward();
      expect(player.nowPlaying()).toBe(ocean);
    });
  });

  describe('togglePlayPause', () => {
    it('with no track does not start a timer', () => {
      player.togglePlayPause();
      expect(player.isPlaying()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('pauses and resumes the timer and audio', () => {
      player.play(rain);
      vi.advanceTimersByTime(1000);
      expect(player.elapsed()).toBe(1);
      player.togglePlayPause();
      expect(player.isPlaying()).toBe(false);
      vi.advanceTimersByTime(3000);
      expect(player.elapsed()).toBe(1);
      player.togglePlayPause();
      vi.advanceTimersByTime(1000);
      expect(player.elapsed()).toBe(2);
      expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(2);
    });

    it('handles a rejected resume: not playing, timer stopped, error exposed', async () => {
      player.play(rain);
      await flush();
      player.togglePlayPause(); // pause
      FakeAudio.playImpl = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      player.togglePlayPause(); // resume -> rejected
      await flush();
      expect(player.isPlaying()).toBe(false);
      expect(player.playbackError()).toBeTruthy();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('autoplay rejection on play()', () => {
    it('sets isPlaying false, stops the timer and exposes playbackError', async () => {
      FakeAudio.playImpl = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      player.play(rain);
      expect(player.isPlaying()).toBe(true); // optimistic until the promise settles
      await flush();
      expect(player.isPlaying()).toBe(false);
      expect(player.playbackError()).toBeTruthy();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('ignores a stale rejection from a previous track', async () => {
      let reject!: (e: unknown) => void;
      FakeAudio.playImpl = () => new Promise<void>((_, r) => { reject = r; });
      player.play(rain);
      FakeAudio.playImpl = () => Promise.resolve();
      player.play(ocean);
      reject(new Error('stale'));
      await flush();
      expect(player.isPlaying()).toBe(true);
      expect(player.playbackError()).toBeNull();
    });
  });

  describe('repeat (repeat-one)', () => {
    it('replays the current track when it ends instead of advancing', () => {
      player.play(rain, [rain, ocean]);
      player.toggleRepeat();
      vi.advanceTimersByTime(3000);
      expect(player.elapsed()).toBe(3);
      vi.advanceTimersByTime(1000); // end reached -> restart
      expect(player.nowPlaying()).toBe(rain);
      expect(player.elapsed()).toBe(0);
      expect(player.isPlaying()).toBe(true);
    });

    it('advances to the next track when repeat is off', () => {
      player.play(rain, [rain, ocean]);
      vi.advanceTimersByTime(4000);
      expect(player.nowPlaying()).toBe(ocean);
    });

    it('skipForward at the end with repeat on replays the current track', () => {
      player.play(rain, [rain, ocean]);
      player.toggleRepeat();
      vi.advanceTimersByTime(3000);
      player.skipForward();
      expect(player.nowPlaying()).toBe(rain);
      expect(player.elapsed()).toBe(0);
    });
  });

  describe('volume, seek, speed', () => {
    it('clamps volume to 0..1 and ignores NaN', () => {
      player.play(rain);
      player.setVolume(5);
      expect(player.volume()).toBe(1);
      expect(FakeAudio.instances[0].volume).toBe(1);
      player.setVolume(-3);
      expect(player.volume()).toBe(0);
      player.setVolume(NaN);
      expect(player.volume()).toBe(0);
    });

    it('seek before metadata does not produce NaN and applies once metadata loads', () => {
      player.play(ocean);
      const audio = FakeAudio.instances[0];
      player.seek(50);
      expect(player.elapsed()).toBe(1800);
      expect(Number.isNaN(audio.currentTime)).toBe(false);
      expect(audio.currentTime).toBe(0);
      audio.duration = 700;
      audio.emit('loadedmetadata');
      expect(audio.currentTime).toBe(1800 % 700);
    });

    it('seek with metadata sets currentTime, clamps percent, rejects NaN, and no-ops with no track', () => {
      player.seek(50);
      expect(player.elapsed()).toBe(0);
      player.play(ocean);
      const audio = FakeAudio.instances[0];
      audio.duration = 7200;
      player.seek(150);
      expect(player.elapsed()).toBe(3600);
      expect(audio.currentTime).toBe(3600);
      player.seek(NaN);
      expect(player.elapsed()).toBe(3600);
      player.seek(-10);
      expect(player.elapsed()).toBe(0);
    });

    it('playback speed scales the timer so progress does not drift', () => {
      player.play(ocean);
      player.cycleSpeed(); // 1.5x
      expect(player.speed()).toBe(1.5);
      expect(FakeAudio.instances[0].playbackRate).toBe(1.5);
      vi.advanceTimersByTime(3000);
      expect(player.elapsed()).toBe(4); // floor(3000ms / (1000/1.5)) = 4 ticks
      player.cycleSpeed(); // 2x
      vi.advanceTimersByTime(1000);
      expect(player.elapsed()).toBe(6);
      player.cycleSpeed(); // back to 1x
      expect(player.speed()).toBe(1);
    });
  });

  describe('playlist identity', () => {
    it('finds the index by id, not title', () => {
      player.play(rainTwin, [rain, rainTwin]);
      expect(player.currentIndex()).toBe(1);
    });

    it('falls back to a single-item playlist when the track is not in the list (findIndex -1)', () => {
      player.play(ocean, [rain]);
      expect(player.currentIndex()).toBe(0);
      expect(player.playlist()).toEqual([ocean]);
    });

    it('skipBack wraps around', () => {
      player.play(rain, [rain, ocean]);
      player.skipBack();
      expect(player.nowPlaying()).toBe(ocean);
    });
  });

  it('formats remaining time without negatives or NaN', () => {
    player.play({ ...rain, duration: 'bad' });
    expect(player.remainingFormatted()).toBe('0:00');
    expect(player.elapsedFormatted()).toBe('0:00');
  });
});
