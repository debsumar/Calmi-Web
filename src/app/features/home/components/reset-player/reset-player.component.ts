import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PlayerService } from '@/core/services/player.service';

type Rgb = readonly [number, number, number];

const BAR_COUNT = 72;
const HALF_BARS = BAR_COUNT / 2;
const CANVAS_SIZE = 260;
const CENTER = CANVAS_SIZE / 2;
const INNER_RADIUS = 62;
const MAX_BAR_LENGTH = 44;
const MIN_BAR_LENGTH = 4;
const FALLBACK_DURATION_LABEL = '01:00';
const IDLE_FRAME_MS = 33;

// Sane fallbacks when CSS vars cannot be resolved (brand / brand-light / coral accent).
const FALLBACK_BRAND: Rgb = [150, 123, 182];
const FALLBACK_BRAND_LIGHT: Rgb = [190, 173, 210];
const ACCENT_CORAL: Rgb = [240, 145, 155];

const rgba = (c: Rgb, a: number): string => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

@Component({
  selector: 'app-reset-player',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center w-full' },
  template: `
    <h3 class="parallax-lag-1 relative z-10 text-2xl font-bold text-on-hero mb-1">{{ title }}</h3>
    <p class="parallax-lag-2 relative z-10 text-on-hero mb-12">{{ artist }}</p>

    <div #stage class="parallax-lag-3 relative w-24 h-24 mb-12 flex items-center justify-center">
      <canvas
        #viz
        aria-hidden="true"
        class="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px]"
      ></canvas>
      <button
        type="button"
        class="relative z-10 w-24 h-24 rounded-full border-2 border-hairline bg-player-surface flex items-center justify-center hover:bg-sunken transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        [attr.aria-label]="isPlaying() ? 'Pause ' + title : 'Play ' + title"
        (click)="toggle()"
      >
        <svg [lucideIcon]="isPlaying() ? 'pause' : 'play'" [size]="36" class="text-ink" [class.ml-1]="!isPlaying()" aria-hidden="true"></svg>
      </button>
      <span class="sr-only" role="status" aria-live="polite">{{ isPlaying() ? 'Playing' : 'Paused' }}</span>
    </div>

    <div class="parallax-lag-3 relative z-10 w-full">
      <div class="relative w-full h-5 flex items-center">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          aria-label="Seek"
          class="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
          [value]="progress()"
          [attr.aria-valuetext]="elapsedLabel() + ' of ' + totalLabel()"
          (input)="onSeek($event)"
        />
        <div class="relative w-full h-1 bg-hairline rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-brand-light">
          <div class="absolute left-0 top-0 h-1 bg-brand rounded-full transition-[width] duration-200 ease-linear" [style.width.%]="progress()"></div>
          <div
            class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand rounded-full transition-[left] duration-200 ease-linear"
            [style.left]="'calc(' + progress() + '% - ' + progress() * 0.12 + 'px)'"
          ></div>
        </div>
      </div>
      <div class="flex justify-between mt-2 text-xs text-on-hero">
        <span>{{ elapsedLabel() }}</span>
        <span>{{ totalLabel() }}</span>
      </div>
    </div>
  `,
})
export class ResetPlayerComponent implements OnDestroy {
  readonly title = 'One-Minute Reset';
  readonly artist = 'Chibs Okereke';
  private readonly src = 'assets/sounds/one-minute-reset.mp3';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly player = inject(PlayerService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly viz = viewChild.required<ElementRef<HTMLCanvasElement>>('viz');

  readonly isPlaying = signal(false);
  private readonly currentTime = signal(0);
  private readonly duration = signal(0);

  readonly progress = computed(() => {
    const d = this.duration();
    return d > 0 ? Math.min(100, (this.currentTime() / d) * 100) : 0;
  });
  readonly elapsedLabel = computed(() => this.format(this.currentTime()));
  readonly totalLabel = computed(() => {
    const d = this.duration();
    return Number.isFinite(d) && d > 0 ? this.format(d) : FALLBACK_DURATION_LABEL;
  });

  // Audio
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  // Visualizer
  private ctx2d: CanvasRenderingContext2D | null = null;
  private rafId = 0;
  private inView = true;
  private tabVisible = true;
  private reduced = false;
  private lastFrameTime = 0;
  private bass = 0;
  private brand: Rgb = FALLBACK_BRAND;
  private ringGradient: CanvasGradient | null = null;
  private glowGradient: CanvasGradient | null = null;
  private observer: IntersectionObserver | null = null;
  private mql: MediaQueryList | null = null;
  private classObserver: MutationObserver | null = null;
  private ringStroke = rgba(FALLBACK_BRAND, 0.28);
  private outerRingStroke = rgba(FALLBACK_BRAND, 0.14);
  private barShadow = rgba(FALLBACK_BRAND, 0.7);
  private readonly levels = new Float32Array(HALF_BARS);
  private readonly binMap = new Uint8Array(HALF_BARS);
  private readonly cos = new Float32Array(BAR_COUNT);
  private readonly sin = new Float32Array(BAR_COUNT);

  private readonly onTimeUpdate = () => this.currentTime.set(this.audio?.currentTime ?? 0);
  private readonly onMetadata = () => this.duration.set(this.finiteDuration());
  private readonly onEnded = () => {
    if (this.audio) this.audio.currentTime = 0;
    this.currentTime.set(0);
    this.isPlaying.set(false);
  };
  private readonly onPauseEvent = () => this.isPlaying.set(false);
  private readonly onVisibility = () => {
    this.tabVisible = document.visibilityState !== 'hidden';
    this.syncLoop();
  };
  private readonly onMotionChange = () => {
    this.reduced = this.readReducedMotion();
    this.syncLoop();
  };

  constructor() {
    const step = (Math.PI * 2) / BAR_COUNT;
    for (let i = 0; i < BAR_COUNT; i++) {
      // Bass at the bottom, mirrored across the vertical axis.
      const a = Math.PI / 2 + step / 2 + i * step;
      this.cos[i] = Math.cos(a);
      this.sin[i] = Math.sin(a);
    }
    for (let m = 0; m < HALF_BARS; m++) {
      this.binMap[m] = Math.round(1 + 95 * Math.pow(m / (HALF_BARS - 1), 1.7));
    }
    // Two-way audio exclusivity: global player starts -> pause the reset audio.
    // Own PlayerService.togglePlayPause() only flips it off, so this never re-pauses ourselves.
    effect(() => {
      const globalPlaying = this.player.isPlaying();
      untracked(() => {
        if (globalPlaying && this.audio && !this.audio.paused) {
          this.audio.pause();
          this.isPlaying.set(false);
        }
      });
    });
    afterNextRender(() => this.setupVisualizer());
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.observer?.disconnect();
    this.observer = null;
    this.mql?.removeEventListener('change', this.onMotionChange);
    this.mql = null;
    this.classObserver?.disconnect();
    this.classObserver = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
      this.audio.removeEventListener('loadedmetadata', this.onMetadata);
      this.audio.removeEventListener('durationchange', this.onMetadata);
      this.audio.removeEventListener('ended', this.onEnded);
      this.audio.removeEventListener('pause', this.onPauseEvent);
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.analyser?.disconnect();
    if (this.audioCtx && this.audioCtx.state !== 'closed') void this.audioCtx.close().catch(() => undefined);
    this.audioCtx = null;
    this.analyser = null;
  }

  toggle(): void {
    const audio = this.ensureAudio();
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (this.player.isPlaying()) this.player.togglePlayPause();
    this.ensureAnalyser(audio);
    void this.audioCtx?.resume().catch(() => undefined);
    audio
      .play()
      .then(() => {
        this.isPlaying.set(true);
        this.syncLoop();
      })
      .catch(() => this.isPlaying.set(false));
  }

  onSeek(event: Event): void {
    const audio = this.ensureAudio();
    const value = Number((event.target as HTMLInputElement).value);
    const d = audio?.duration ?? 0;
    if (!audio || !Number.isFinite(d) || d <= 0 || !Number.isFinite(value)) {
      // Metadata not ready: snap the thumb back so the input does not desync from progress().
      (event.target as HTMLInputElement).value = String(this.progress());
      return;
    }
    audio.currentTime = (value / 100) * d;
    this.currentTime.set(audio.currentTime);
  }

  // ---- audio helpers ----

  private ensureAudio(): HTMLAudioElement | null {
    if (this.audio) return this.audio;
    if (typeof Audio === 'undefined') return null;
    const audio = new Audio(this.src);
    audio.loop = false;
    audio.preload = 'metadata';
    audio.addEventListener('timeupdate', this.onTimeUpdate);
    audio.addEventListener('loadedmetadata', this.onMetadata);
    audio.addEventListener('durationchange', this.onMetadata);
    audio.addEventListener('ended', this.onEnded);
    audio.addEventListener('pause', this.onPauseEvent);
    this.audio = audio;
    return audio;
  }

  private ensureAnalyser(audio: HTMLAudioElement): void {
    if (this.analyser || this.audioCtx) return;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      this.audioCtx = ctx;
      this.analyser = analyser;
      this.freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      // Web Audio unavailable: playback continues, visual falls back to idle breathing.
      this.analyser = null;
      this.freqData = null;
    }
  }

  private finiteDuration(): number {
    const d = this.audio?.duration ?? 0;
    return Number.isFinite(d) && d > 0 ? d : 0;
  }

  private format(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ---- visualizer ----

  private readReducedMotion(): boolean {
    const mq = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return mq || document.documentElement.classList.contains('reduce-motion');
  }

  private setupVisualizer(): void {
    const canvas = this.viz().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    this.ctx2d = ctx;

    this.reduced = this.readReducedMotion();
    this.mql = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.mql?.addEventListener('change', this.onMotionChange);
    if (typeof MutationObserver !== 'undefined') {
      this.classObserver = new MutationObserver(this.onMotionChange);
      this.classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.tabVisible = document.visibilityState !== 'hidden';

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver((entries) => {
        this.inView = entries[entries.length - 1]?.isIntersecting ?? true;
        this.syncLoop();
      });
      this.observer.observe(this.stage().nativeElement);
    }
    this.syncLoop();
  }

  private syncLoop(): void {
    if (!this.ctx2d) return;
    if (this.reduced) {
      this.stopLoop();
      this.refreshPalette();
      this.drawFrame(0, true);
      return;
    }
    if (this.inView && this.tabVisible) {
      if (!this.rafId) {
        this.refreshPalette();
        this.rafId = requestAnimationFrame(this.frame);
      }
    } else {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private readonly frame = (now: number): void => {
    this.rafId = 0;
    if (!this.inView || !this.tabVisible || this.reduced) return;
    // Idle breathing is slow; render it at ~30fps.
    if (this.isPlaying() || now - this.lastFrameTime >= IDLE_FRAME_MS) {
      this.lastFrameTime = now;
      this.drawFrame(now / 1000, false);
    }
    this.rafId = requestAnimationFrame(this.frame);
  };

  /** Resolve theme colors once per loop start (cheap, keeps palette/dark-mode changes in sync). */
  private refreshPalette(): void {
    const style = getComputedStyle(this.host.nativeElement);
    const light = this.resolveColor(style.getPropertyValue('--color-brand-light'), FALLBACK_BRAND_LIGHT);
    const brand = this.resolveColor(style.getPropertyValue('--color-brand'), FALLBACK_BRAND);
    this.brand = brand;
    const ctx = this.ctx2d;
    if (!ctx) return;
    const ring = ctx.createRadialGradient(CENTER, CENTER, INNER_RADIUS - 4, CENTER, CENTER, INNER_RADIUS + MAX_BAR_LENGTH);
    ring.addColorStop(0, rgba(light, 1));
    ring.addColorStop(0.5, rgba(brand, 1));
    ring.addColorStop(1, rgba(ACCENT_CORAL, 1));
    this.ringGradient = ring;
    // Unit-radius glow, scaled per frame (no per-frame gradient allocation).
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    glow.addColorStop(0, rgba(brand, 0.45));
    glow.addColorStop(1, rgba(brand, 0));
    this.glowGradient = glow;
    this.ringStroke = rgba(brand, 0.28);
    this.outerRingStroke = rgba(brand, 0.14);
    this.barShadow = rgba(brand, 0.7);
  }

  private resolveColor(css: string, fallback: Rgb): Rgb {
    const value = css.trim();
    if (!value) return fallback;
    try {
      const probe = document.createElement('canvas');
      probe.width = 1;
      probe.height = 1;
      const pctx = probe.getContext('2d', { willReadFrequently: true });
      if (!pctx) return fallback;
      // Sentinel: an unparseable value leaves fillStyle untouched, so detect that and use the fallback.
      pctx.fillStyle = 'rgba(0, 0, 0, 0)';
      const sentinel = pctx.fillStyle;
      pctx.fillStyle = value;
      if (pctx.fillStyle === sentinel) return fallback;
      pctx.fillRect(0, 0, 1, 1);
      const d = pctx.getImageData(0, 0, 1, 1).data;
      return d[3] === 0 ? fallback : [d[0], d[1], d[2]];
    } catch {
      return fallback;
    }
  }

  private drawFrame(t: number, staticFrame: boolean): void {
    const ctx = this.ctx2d;
    if (!ctx || !this.ringGradient || !this.glowGradient) return;

    const live = !staticFrame && this.isPlaying() && !!this.analyser && !!this.freqData;
    const data = this.freqData;
    if (live && this.analyser && data) {
      this.analyser.getByteFrequencyData(data);
    }

    // Levels (mirrored half) with attack/decay smoothing.
    let bassSum = 0;
    for (let m = 0; m < HALF_BARS; m++) {
      let target: number;
      if (live && data) {
        target = Math.pow(data[this.binMap[m]] / 255, 1.35);
      } else {
        target = 0.16 + 0.07 * Math.sin(t * 1.1 + m * 0.3) + 0.04 * Math.sin(t * 0.7 - m * 0.5);
      }
      const cur = this.levels[m];
      this.levels[m] = staticFrame ? target : cur + (target - cur) * (target > cur ? 0.45 : 0.12);
    }
    if (live && data) {
      for (let b = 1; b <= 6; b++) bassSum += data[b];
      this.bass += (bassSum / 6 / 255 - this.bass) * 0.2;
    } else {
      const idleBass = 0.18 + 0.08 * Math.sin(t * 0.9);
      this.bass = staticFrame ? idleBass : this.bass + (idleBass - this.bass) * 0.1;
    }

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.shadowBlur = 0;

    // Soft glow following bass energy.
    ctx.save();
    ctx.translate(CENTER, CENTER);
    const glowRadius = 80 + this.bass * 50;
    ctx.scale(glowRadius, glowRadius);
    ctx.fillStyle = this.glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Two faint breathing rings.
    const pulse = Math.sin(t * 0.9);
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.ringStroke;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 53 + pulse * 2 + this.bass * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = this.outerRingStroke;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 118 + pulse * 3 + this.bass * 6, 0, Math.PI * 2);
    ctx.stroke();

    // Radial spectrum bars, one path + one stroke (single glow pass).
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = this.ringGradient;
    ctx.shadowColor = this.barShadow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < BAR_COUNT; i++) {
      const m = i < HALF_BARS ? i : BAR_COUNT - 1 - i;
      const len = MIN_BAR_LENGTH + Math.min(1, this.levels[m]) * (MAX_BAR_LENGTH - MIN_BAR_LENGTH);
      const c = this.cos[i];
      const s = this.sin[i];
      ctx.moveTo(CENTER + c * INNER_RADIUS, CENTER + s * INNER_RADIUS);
      ctx.lineTo(CENTER + c * (INNER_RADIUS + len), CENTER + s * (INNER_RADIUS + len));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
