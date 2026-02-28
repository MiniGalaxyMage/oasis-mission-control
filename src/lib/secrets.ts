// ─── Konami Code & Secret Sequences ───────────────────────────
import { toastManager } from './toast-manager';
import { achievementManager } from './achievements';

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export interface PartyState {
  active: boolean;
  endTime: number;
  particles: PartyParticle[];
}

export interface PartyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number; // 0-1
  size: number;
}

const PARTY_COLORS = ['#FF0000','#FF7700','#FFFF00','#00FF00','#0088FF','#FF00FF','#FF69B4','#00FFFF'];

class KonamiDetector {
  private buffer: string[] = [];
  private onActivate: (() => void) | null = null;

  constructor() {
    window.addEventListener('keydown', this.handleKey);
  }

  setCallback(cb: () => void): void {
    this.onActivate = cb;
  }

  private handleKey = (e: KeyboardEvent): void => {
    this.buffer.push(e.key);
    if (this.buffer.length > KONAMI.length) {
      this.buffer.shift();
    }
    if (this.buffer.length === KONAMI.length &&
        this.buffer.every((k, i) => k === KONAMI[i])) {
      this.buffer = [];
      this.activate();
    }
  };

  private activate(): void {
    localStorage.setItem('oasis-konami-found', 'true');
    achievementManager.unlock('konami');
    toastManager.show(
      'success',
      '🥚 EASTER EGG',
      '"Going outside is highly overrated" — Ready Player One',
      '🎮',
      8000,
    );
    this.onActivate?.();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKey);
  }
}

export const konamiDetector = new KonamiDetector();

// ── Party mode state ─────────────────────────────────────────
export const partyState: PartyState = {
  active: false,
  endTime: 0,
  particles: [],
};

export function activatePartyMode(): void {
  partyState.active = true;
  partyState.endTime = Date.now() + 10_000;
  partyState.particles = [];
}

export function updatePartyParticles(agents: { position: { x: number; y: number } }[]): void {
  if (!partyState.active) return;
  if (Date.now() > partyState.endTime) {
    partyState.active = false;
    partyState.particles = [];
    return;
  }

  // Spawn from agents
  for (const agent of agents) {
    if (Math.random() < 0.4) {
      partyState.particles.push({
        x: agent.position.x + (Math.random() - 0.5) * 30,
        y: agent.position.y - 60 * Math.random(),
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 2,
        color: PARTY_COLORS[Math.floor(Math.random() * PARTY_COLORS.length)],
        life: 1,
        size: 3 + Math.random() * 4,
      });
    }
  }

  // Update existing
  for (const p of partyState.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravity
    p.life -= 0.02;
  }
  partyState.particles = partyState.particles.filter((p) => p.life > 0);
}

export function drawPartyEffects(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
  if (!partyState.active) return;

  // Golden flash overlay (pulse)
  const elapsed = Date.now();
  const pulse = Math.sin(elapsed / 100) * 0.5 + 0.5;
  ctx.save();
  ctx.globalAlpha = 0.08 * pulse;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();

  // Particles
  for (const p of partyState.particles) {
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }
}
