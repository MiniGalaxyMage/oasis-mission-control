// ─── Audio Manager ────────────────────────────────────────────
// Singleton para gestionar sfx y música ambiental retro 8-bit.
// Los sfx usan cloneNode() para poder sonar simultáneamente.

class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private music: HTMLAudioElement | null = null;
  private sfxVolume = 0.5;
  private musicVolume = 0.15;
  private _muted = false;

  constructor() {
    // Restaurar estado mute desde localStorage
    try {
      this._muted = localStorage.getItem('oasis-muted') === 'true';
    } catch {
      this._muted = false;
    }
  }

  preload(id: string, src: string): void {
    if (this.sounds.has(id)) return;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = this.sfxVolume;
    this.sounds.set(id, audio);
  }

  play(id: string): void {
    if (this._muted) return;
    const original = this.sounds.get(id);
    if (!original) return;
    try {
      const clone = original.cloneNode() as HTMLAudioElement;
      clone.volume = this.sfxVolume;
      clone.play().catch(() => {/* autoplay blocked, ignorar silenciosamente */});
    } catch {
      // silencioso
    }
  }

  playMusic(src: string, loop = false): void {
    if (this.music) {
      this.music.pause();
      this.music = null;
    }
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = this._muted ? 0 : this.musicVolume;
    this.music = audio;
    audio.play().catch(() => {/* autoplay bloqueado por el browser */});
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music = null;
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    try {
      localStorage.setItem('oasis-muted', String(this._muted));
    } catch {
      // ignorar
    }
    // Sincronizar música
    if (this.music) {
      this.music.volume = this._muted ? 0 : this.musicVolume;
    }
    return this._muted;
  }
}

export const audioManager = new AudioManager();

// Precargar todos los sonidos al importar el módulo
audioManager.preload('click', '/assets/audio/click.mp3');
audioManager.preload('dialog-open', '/assets/audio/dialog-open.mp3');
audioManager.preload('type-tick', '/assets/audio/type-tick.mp3');
audioManager.preload('task-complete', '/assets/audio/task-complete.mp3');
audioManager.preload('agent-wake', '/assets/audio/agent-wake.mp3');
audioManager.preload('room-transition', '/assets/audio/room-transition.mp3');
