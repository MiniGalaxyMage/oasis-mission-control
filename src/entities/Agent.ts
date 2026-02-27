import Phaser from 'phaser';
import { AgentData } from '../types';

const STATUS_COLORS: Record<string, number> = {
  idle: 0x00ff88,
  working: 0x4488ff,
  thinking: 0xffdd00,
  orchestrating: 0xcc44ff,
  error: 0xff2244,
  done: 0x00ffcc,
};

interface Waypoint {
  x: number;
  y: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; color: number;
}

/** Devuelve la texture key y escala base para cada tipo de agente. */
function getAgentConfig(data: AgentData): { texKey: string; scale: number } {
  if (data.id === 'percival') return { texKey: 'percival-idle', scale: 0.20 };
  if (data.id === 'sprite')   return { texKey: 'sprite-idle',   scale: 0.10 };
  return { texKey: 'forge-idle', scale: 0.12 };
}

/**
 * Agent — personaje con sprite real de Gemini.
 * Percival = mago púrpura. Forge* = herrero. Sprite = hada luminosa.
 */
export class Agent extends Phaser.GameObjects.Container {
  public agentData: AgentData;
  private characterSprite!: Phaser.GameObjects.Sprite;
  private shadowGfx!: Phaser.GameObjects.Graphics;
  private particleGfx!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private moveDir = 1; // 1 = right, -1 = left
  private isMoving = false;
  private particles: Particle[] = [];
  readonly isPercival: boolean;
  readonly isSprite: boolean;

  // Waypoint movement
  private taskTarget: Waypoint | null = null;
  private idleWaypoints: Waypoint[] = [];
  private currentWaypointIndex = 0;
  private idleTimer = 0;
  private idlePause = 0;

  // Float animation for fairy
  private floatTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, data: AgentData) {
    super(scene, x, y);
    this.agentData = data;
    this.isPercival = data.id === 'percival';
    this.isSprite   = data.id === 'sprite';

    const { texKey, scale } = getAgentConfig(data);

    // Shadow ellipse (behind sprite)
    this.shadowGfx = scene.add.graphics();
    this.shadowGfx.fillStyle(0x000000, 0.22);
    this.shadowGfx.fillEllipse(0, 4, 50, 12);
    this.add(this.shadowGfx);

    // Real sprite
    this.characterSprite = scene.add.sprite(0, 0, texKey);
    this.characterSprite.setOrigin(0.5, 1);
    this.characterSprite.setScale(scale);
    this.add(this.characterSprite);

    // Particle layer (in front)
    this.particleGfx = scene.add.graphics();
    this.add(this.particleGfx);

    // Kick off animation
    this.playAnimation();

    // Label
    this.buildLabel();

    // Interactivity
    const hitW = 80, hitH = 120;
    this.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH, hitW, hitH + 24),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerover', () => {
      scene.input.setDefaultCursor('pointer');
      this.showTooltip();
    });
    this.on('pointerout', () => {
      scene.input.setDefaultCursor('default');
      this.hideTooltip();
    });
    this.on('pointerdown', () => this.showSpeechBubble());
  }

  // ─── Animation ───────────────────────────────────────────────────────────

  private playAnimation(): void {
    const { agentData } = this;
    let animKey: string;

    if (agentData.id === 'percival') {
      animKey = 'percival-idle';
    } else if (agentData.id === 'sprite') {
      animKey = 'sprite-idle';
    } else {
      // Forge agents
      animKey = agentData.status === 'working' ? 'forge-working' : 'forge-idle';
    }

    if (this.characterSprite.anims.currentAnim?.key !== animKey) {
      this.characterSprite.play(animKey, true);
    }
  }

  // ─── Waypoints / movement ────────────────────────────────────────────────

  setIdleWaypoints(waypoints: Waypoint[]): void {
    this.idleWaypoints = waypoints;
  }

  setTaskTarget(wp: Waypoint | null): void {
    this.taskTarget = wp;
  }

  // ─── Label ───────────────────────────────────────────────────────────────

  private buildLabel(): void {
    const color = STATUS_COLORS[this.agentData.status] ?? 0xffffff;
    this.nameText = this.scene.add.text(0, 10, this.agentData.name, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.statusText = this.scene.add.text(0, 22, this.agentData.status.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.add([this.nameText, this.statusText]);
  }

  // ─── Particles ───────────────────────────────────────────────────────────

  private spawnMagicParticle(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = Phaser.Math.FloatBetween(0.5, 2);
    this.particles.push({
      x: 0, y: -60,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      color: [0xcc44ff, 0xff88ff, 0xffffff, 0x8844ff][Phaser.Math.Between(0, 3)],
    });
  }

  private spawnFairySparkle(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = Phaser.Math.FloatBetween(0.3, 1.5);
    this.particles.push({
      x: Phaser.Math.Between(-15, 15), y: -40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 1,
      color: [0xffffff, 0xaaffff, 0x88ffee, 0xffeeaa][Phaser.Math.Between(0, 3)],
    });
  }

  private drawParticles(): void {
    const g = this.particleGfx;
    g.clear();
    for (const p of this.particles) {
      g.fillStyle(p.color, p.life);
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  }

  // ─── Update loop ─────────────────────────────────────────────────────────

  update(delta: number): void {
    this.idleTimer += delta;
    this.floatTimer += delta * 0.002;

    // Flip sprite when moving left/right
    this.characterSprite.setFlipX(this.moveDir < 0);

    // Fairy float bob
    if (this.isSprite) {
      this.characterSprite.y = Math.sin(this.floatTimer * 3) * 5;
      if (Math.random() < 0.08) this.spawnFairySparkle();
    }

    // Magic particles for percival orchestrating
    if (this.agentData.status === 'orchestrating' && Math.random() < 0.06) {
      this.spawnMagicParticle();
    }

    // Update particles
    const dt = delta / 16;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt;
      p.life -= dt * 0.04;
    }
    this.drawParticles();

    // Idle movement
    if (this.idleWaypoints.length > 0 && !this.taskTarget) {
      if (!this.isMoving && this.idleTimer > this.idlePause) {
        this.idleTimer = 0;
        this.idlePause = Phaser.Math.Between(1200, 3500);
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.idleWaypoints.length;
        const wp = this.idleWaypoints[this.currentWaypointIndex];
        this.walkTo(wp.x, wp.y);
      }
    }

    // Move to task target
    if (this.taskTarget && !this.isMoving) {
      this.walkTo(this.taskTarget.x, this.taskTarget.y);
    }
  }

  walkTo(tx: number, ty: number): void {
    if (Math.abs(tx - this.x) < 5 && Math.abs(ty - this.y) < 5) return;
    this.moveDir = tx > this.x ? 1 : -1;
    this.isMoving = true;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    const duration = Math.max(600, dist * 3.5);
    this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.isMoving = false;
        this.taskTarget = null;
      },
    });
  }

  // ─── Data update ─────────────────────────────────────────────────────────

  updateData(data: AgentData): void {
    this.agentData = data;
    const color = STATUS_COLORS[data.status] ?? 0xffffff;
    this.statusText.setText(data.status.toUpperCase());
    this.statusText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba);
    // Switch animation if forge working state changed
    this.playAnimation();
  }

  // ─── Tooltip / Speech Bubble ─────────────────────────────────────────────

  private showTooltip(): void {
    if (this.tooltip) return;
    const lines = [
      `${this.agentData.name}`,
      `Estado: ${this.agentData.status}`,
      `Modelo: ${this.agentData.model}`,
      `Tarea: ${this.agentData.currentTask ?? 'ninguna'}`,
    ];
    const w = 200, lh = 14;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.95);
    bg.lineStyle(2, STATUS_COLORS[this.agentData.status] ?? 0x4488ff);
    bg.fillRoundedRect(0, 0, w, lines.length * lh + 12, 4);
    bg.strokeRoundedRect(0, 0, w, lines.length * lh + 12, 4);
    const texts = lines.map((line, i) =>
      this.scene.add.text(8, 6 + i * lh, line, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: Phaser.Display.Color.IntegerToColor(STATUS_COLORS[this.agentData.status] ?? 0x00ccff).rgba,
      })
    );
    this.tooltip = this.scene.add.container(this.x + 34, this.y - 60, [bg, ...texts]);
    this.tooltip.setDepth(300);
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
  }

  private showSpeechBubble(): void {
    if (this.speechBubble) return;
    let text: string;
    if (this.isPercival) {
      text = this.agentData.status === 'orchestrating'
        ? `Orquestando: ${this.agentData.currentTask ?? '???'}`
        : this.agentData.status === 'thinking'
        ? '...pensando en el plan...'
        : '¡OASIS te necesita!';
    } else if (this.isSprite) {
      text = this.agentData.status === 'working'
        ? `Pintando: ${this.agentData.currentTask ?? '???'}`
        : '✨ Flotando entre ideas...';
    } else {
      text = this.agentData.status === 'working'
        ? `Forjando: ${this.agentData.currentTask ?? '???'}`
        : this.agentData.status === 'done'
        ? '¡Misión completada!'
        : this.agentData.status === 'error'
        ? '¡Algo salió mal!'
        : 'En espera de órdenes.';
    }
    const w = 180;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.lineStyle(2, 0x222222, 1);
    bg.fillRoundedRect(0, 0, w, 30, 6);
    bg.strokeRoundedRect(0, 0, w, 30, 6);
    bg.fillTriangle(20, 30, 30, 30, 25, 40);
    bg.strokeTriangle(20, 30, 30, 30, 25, 40);
    const txt = this.scene.add.text(8, 8, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#222222',
      wordWrap: { width: 164 },
    });
    this.speechBubble = this.scene.add.container(this.x - 24, this.y - 100, [bg, txt]);
    this.speechBubble.setDepth(350);
    this.scene.time.delayedCall(3000, () => {
      if (this.speechBubble) { this.speechBubble.destroy(); this.speechBubble = null; }
    });
  }
}
