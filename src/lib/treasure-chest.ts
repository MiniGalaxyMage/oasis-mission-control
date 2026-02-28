// ─── Treasure Chest Canvas Animation ──────────────────────────
import { toastManager } from './toast-manager';
import { audioManager } from './audio';

export interface TreasureChest {
  x: number;
  y: number;
  state: 'closed' | 'opening' | 'open' | 'hidden';
  animFrame: number;
  animTimer: number; // ms accumulated
  reward: string;
  alpha: number;
  particles: ChestParticle[];
  hideTimer: number;
}

interface ChestParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
  size: number;
}

const REWARDS = [
  '+150 XP — Tarea completada!',
  '+200 XP — ¡Excelente trabajo!',
  '+100 XP — Misión cumplida!',
  '+175 XP — Agente eficiente!',
];

export function createTreasureChest(x: number, y: number): TreasureChest {
  const reward = REWARDS[Math.floor(Math.random() * REWARDS.length)];
  return {
    x,
    y: y - 30,
    state: 'closed',
    animFrame: 0,
    animTimer: 0,
    reward,
    alpha: 1,
    particles: [],
    hideTimer: 0,
  };
}

export function updateTreasureChest(chest: TreasureChest, dt: number): void {
  chest.animTimer += dt;

  switch (chest.state) {
    case 'closed':
      if (chest.animTimer > 400) {
        chest.state = 'opening';
        chest.animTimer = 0;
        chest.animFrame = 1;
      }
      break;

    case 'opening':
      if (chest.animTimer > 300) {
        chest.animFrame++;
        chest.animTimer = 0;
        if (chest.animFrame >= 3) {
          chest.state = 'open';
          chest.animTimer = 0;
          // Spawn particles
          for (let i = 0; i < 7; i++) {
            chest.particles.push({
              x: chest.x,
              y: chest.y - 10,
              vx: (Math.random() - 0.5) * 4,
              vy: -3 - Math.random() * 3,
              life: 1,
              size: 3 + Math.random() * 3,
            });
          }
          // Sound + toast
          audioManager.play('task-complete');
          toastManager.show('success', '💰 Recompensa', chest.reward, '🎁', 4000);
        }
      }
      break;

    case 'open':
      chest.hideTimer += dt;
      // Update particles
      for (const p of chest.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.025;
      }
      chest.particles = chest.particles.filter((p) => p.life > 0);
      // Fade out after 4s
      if (chest.hideTimer > 3000) {
        chest.alpha = Math.max(0, 1 - (chest.hideTimer - 3000) / 1000);
        if (chest.alpha <= 0) chest.state = 'hidden';
      }
      break;
  }
}

export function drawTreasureChest(ctx: CanvasRenderingContext2D, chest: TreasureChest): void {
  if (chest.state === 'hidden') return;

  const { x, y, alpha, animFrame } = chest;
  const W = 36;
  const H = 28;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Sparkle on spawn
  if (chest.state === 'closed' && chest.animTimer < 400) {
    drawSparkle(ctx, x, y - H / 2 - 10, chest.animTimer / 400);
  }

  // ── Draw chest body ──────────────────────────────────────
  const lidOpenAmount = animFrame >= 1 ? (animFrame >= 2 ? 14 : 7) : 0;

  // Shadow
  ctx.save();
  ctx.globalAlpha = alpha * 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + H / 2 + 4, W / 1.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bottom half (base)
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x - W / 2, y - H / 2 + lidOpenAmount / 2, W, H * 0.55);

  // Darker planks
  ctx.fillStyle = '#6B3410';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - W / 2 + 2 + i * 12, y - H / 2 + lidOpenAmount / 2 + 2, 10, H * 0.55 - 4);
  }

  // Lid
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(x - W / 2, y - H / 2 - lidOpenAmount, W, H * 0.45);

  // Lid plank detail
  ctx.fillStyle = '#7A3E1F';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - W / 2 + 2 + i * 12, y - H / 2 - lidOpenAmount + 2, 10, H * 0.45 - 4);
  }

  // Metal rim
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x - W / 2, y - 2, W, 4); // horizontal band
  ctx.fillRect(x - W / 2, y - H / 2 - lidOpenAmount, W, 3); // lid rim

  // Lock
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x - 5, y - 6, 10, 8);
  ctx.fillStyle = '#B8860B';
  ctx.beginPath();
  ctx.arc(x, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Glow when open
  if (chest.state === 'open') {
    ctx.save();
    const grd = ctx.createRadialGradient(x, y - H / 2, 2, x, y - H / 2, 30);
    grd.addColorStop(0, 'rgba(255,215,0,0.6)');
    grd.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = grd;
    ctx.fillRect(x - 30, y - H / 2 - 30, 60, 60);
    ctx.restore();
  }

  // Gold particles
  for (const p of chest.particles) {
    ctx.save();
    ctx.globalAlpha = alpha * p.life;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }

  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number): void {
  ctx.save();
  ctx.globalAlpha = (1 - progress) * 0.8;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  const size = 8 + progress * 6;
  // 4 rays
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.stroke();
  }
  ctx.restore();
}
