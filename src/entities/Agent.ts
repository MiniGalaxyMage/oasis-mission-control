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

/**
 * Agent — personaje jugable grande (48x72px), con movimiento por la habitación.
 * Percival = mago púrpura. Forge* = herrero naranja.
 */
export class Agent extends Phaser.GameObjects.Container {
  public agentData: AgentData;
  private spriteGfx!: Phaser.GameObjects.Graphics;
  private labelGfx!: Phaser.GameObjects.Graphics;
  private particleGfx!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private animTimer = 0;
  private animFrame = 0;
  private moveDir = 1; // 1 = right, -1 = left
  private isMoving = false;
  private walkCycle = 0;
  private particles: Particle[] = [];
  readonly isPercival: boolean;

  // Task position this agent should move to
  private taskTarget: Waypoint | null = null;
  private idleWaypoints: Waypoint[] = [];
  private currentWaypointIndex = 0;
  private idleTimer = 0;
  private idlePause = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, data: AgentData) {
    super(scene, x, y);
    this.agentData = data;
    this.isPercival = data.id === 'percival';

    this.spriteGfx = scene.add.graphics();
    this.labelGfx = scene.add.graphics();
    this.particleGfx = scene.add.graphics();
    this.add([this.particleGfx, this.spriteGfx, this.labelGfx]);

    this.buildLabel();
    this.drawSprite();

    this.setInteractive(
      new Phaser.Geom.Rectangle(-28, -60, 56, 80),
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

  setIdleWaypoints(waypoints: Waypoint[]): void {
    this.idleWaypoints = waypoints;
  }

  setTaskTarget(wp: Waypoint | null): void {
    this.taskTarget = wp;
  }

  private buildLabel(): void {
    const color = STATUS_COLORS[this.agentData.status] ?? 0xffffff;
    this.nameText = this.scene.add.text(0, 44, this.agentData.name, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.statusText = this.scene.add.text(0, 56, this.agentData.status.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.add([this.nameText, this.statusText]);
  }

  private drawSprite(): void {
    const g = this.spriteGfx;
    g.clear();
    const frame = this.animFrame;
    const S = 4; // 1 pixel = 4x4 actual px

    if (this.isPercival) {
      this.drawPercival(g, S, frame);
    } else {
      this.drawForgeAgent(g, S, frame);
    }
  }

  /**
   * Percival — mago con túnica púrpura, sombrero, gafas y varita.
   * Grid 12px wide * 18px tall (en unidades S), origin centro-bajo.
   * Actual pixels: 48 x 72+
   */
  private drawPercival(g: Phaser.GameObjects.Graphics, S: number, frame: number): void {
    const dir = this.moveDir; // 1 = right, -1 = left
    const walk = this.isMoving ? Math.sin(this.walkCycle * 0.15) : 0;
    const legSwing = Math.sin(this.walkCycle * 0.15) * 2;
    const armSwing = -Math.sin(this.walkCycle * 0.15) * 2;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 42, 44, 10);

    // Boots
    g.fillStyle(0x2a1a44);
    g.fillRect((-3 + legSwing) * S, 9 * S, 3 * S, 3 * S);
    g.fillRect((0 - legSwing) * S, 9 * S, 3 * S, 3 * S);

    // Robe body — púrpura
    g.fillStyle(0x7733bb);
    g.fillRect(-5 * S, 0, 10 * S, 9 * S);
    // Robe inner shadow
    g.fillStyle(0x5522aa);
    g.fillRect(-3 * S, 1 * S, 6 * S, 8 * S);
    // Robe hem
    g.fillStyle(0x8844cc);
    g.fillRect(-6 * S, 8 * S, 12 * S, 2 * S);

    // Belt
    g.fillStyle(0xaa8822);
    g.fillRect(-5 * S, 4 * S, 10 * S, S);

    // Arms
    const armY = S;
    g.fillStyle(0x7733bb);
    g.fillRect((-8 + armSwing) * S, armY, 3 * S, 6 * S);
    g.fillRect((5 - armSwing) * S, armY, 3 * S, 6 * S);

    // Wand hand (right when dir=1)
    const wandX = dir > 0 ? 7 * S : -9 * S;
    g.fillStyle(0x885522);
    g.fillRect(wandX, 0, 2 * S, 7 * S);
    // Wand tip glow
    const tipAlpha = 0.7 + 0.3 * Math.sin(frame * 0.3);
    g.fillStyle(0xffdd44, tipAlpha);
    g.fillCircle(wandX + S, -S, 4);
    g.fillStyle(0xffffff, tipAlpha * 0.5);
    g.fillCircle(wandX + S, -S, 2);

    // Neck
    g.fillStyle(0xffcc99);
    g.fillRect(-2 * S, -7 * S, 4 * S, 2 * S);

    // Head
    g.fillStyle(0xffcc99);
    g.fillRect(-4 * S, -13 * S, 8 * S, 7 * S);
    // Head outline
    g.lineStyle(1, 0xcc9966, 0.5);
    g.strokeRect(-4 * S, -13 * S, 8 * S, 7 * S);

    // Eyes
    g.fillStyle(0x333333);
    g.fillRect(-3 * S, -11 * S, S, S);
    g.fillRect(2 * S, -11 * S, S, S);

    // Glasses — cyan
    g.lineStyle(2, 0x00bbee, 1);
    g.strokeRect((-4 + 0.5) * S, -12 * S, 3 * S, 2 * S);
    g.strokeRect((0.5) * S, -12 * S, 3 * S, 2 * S);
    g.lineStyle(1, 0x00bbee, 1);
    g.lineBetween(-0.5 * S, -11 * S, 0.5 * S, -11 * S); // bridge

    // Smile
    g.lineStyle(1, 0xcc8844, 1);
    g.lineBetween(-2 * S, -7 * S - 2, -S, -7 * S);
    g.lineBetween(-S, -7 * S, S, -7 * S);
    g.lineBetween(S, -7 * S, 2 * S, -7 * S - 2);

    // Wizard hat — dark purple
    g.fillStyle(0x331166);
    // Hat brim
    g.fillRect(-6 * S, -14 * S, 12 * S, 2 * S);
    // Hat cone
    g.fillStyle(0x442288);
    g.fillRect(-3 * S, -22 * S, 6 * S, 9 * S);
    // Hat tip
    g.fillTriangle(-2 * S, -22 * S, 2 * S, -22 * S, 0, -26 * S);
    // Hat star
    g.fillStyle(0xffee00);
    g.fillRect(-S, -20 * S, 2 * S, 2 * S);
    g.fillRect(-2 * S, -19 * S, 4 * S, S);
    // Hat band
    g.fillStyle(0x5533aa);
    g.fillRect(-3 * S, -15 * S, 6 * S, S);

    // Status effects
    if (this.agentData.status === 'thinking') {
      // Question marks float
      g.fillStyle(0xffdd00, 0.9);
      g.fillRect(-10 * S, -24 * S + Math.floor(frame * 0.05 % 4), S, S);
      g.fillRect(9 * S, -22 * S + Math.floor(frame * 0.04 % 4), S, S);
    }
    if (this.agentData.status === 'orchestrating') {
      // Magic sparkles
      const sp = frame * 0.08;
      g.fillStyle(0xff88ff, 0.9);
      g.fillRect(-10 * S, -10 * S + Math.sin(sp) * 4, 2 * S, 2 * S);
      g.fillRect(8 * S, -14 * S + Math.cos(sp) * 4, 2 * S, 2 * S);
      g.fillRect(-6 * S, -28 * S + Math.sin(sp * 1.3) * 3, 2 * S, 2 * S);
    }
    if (this.agentData.status === 'error') {
      // Red blink
      if (Math.floor(frame * 0.05) % 2 === 0) {
        g.fillStyle(0xff2244, 0.35);
        g.fillRect(-6 * S, -26 * S, 12 * S, 36 * S);
      }
    }
  }

  /**
   * Forge (herrero) — delantal naranja, casco, martillo.
   * Grid 12px wide * 18px tall, origin centro-bajo.
   */
  private drawForgeAgent(g: Phaser.GameObjects.Graphics, S: number, frame: number): void {
    const dir = this.moveDir;
    const working = this.agentData.status === 'working';
    const hammerBob = working ? Math.sin(this.walkCycle * 0.2) * 3 : 0;
    const legSwing = this.isMoving ? Math.sin(this.walkCycle * 0.15) * 2 : 0;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 42, 44, 10);

    // Boots
    g.fillStyle(0x4a2810);
    g.fillRect((-3 + legSwing) * S, 9 * S, 4 * S, 3 * S);
    g.fillRect((0 - legSwing) * S, 9 * S, 4 * S, 3 * S);
    // Boot highlights
    g.lineStyle(1, 0x6b3a18, 0.7);
    g.strokeRect((-3 + legSwing) * S, 9 * S, 4 * S, 3 * S);

    // Pants — dark brown
    g.fillStyle(0x3a2010);
    g.fillRect(-4 * S, 6 * S, 8 * S, 4 * S);

    // Leather apron — dark ochre
    g.fillStyle(0x7a5010);
    g.fillRect(-5 * S, 0, 10 * S, 9 * S);
    // Apron inner
    g.fillStyle(0x5a3a08);
    g.fillRect(-4 * S, S, 8 * S, 7 * S);
    // Apron ties
    g.fillStyle(0x8a6020);
    g.fillRect(-6 * S, 0, 2 * S, 7 * S);
    g.fillRect(4 * S, 0, 2 * S, 7 * S);

    // Arms
    const armY = S;
    const armColor = 0xee7700;
    g.fillStyle(armColor);
    g.fillRect(-8 * S, armY, 3 * S, 5 * S);
    g.fillRect(5 * S, armY, 3 * S, 5 * S);

    // Hammer (dominant hand)
    const hamX = dir > 0 ? 7 * S : -9 * S;
    const hamY = hammerBob;
    // Handle
    g.fillStyle(0x7a4a18);
    g.fillRect(hamX, armY + hamY, 2 * S, 7 * S);
    // Hammer head
    g.fillStyle(0x666666);
    g.fillRect(hamX - S, armY + hamY - 2 * S, 4 * S, 3 * S);
    g.fillStyle(0x888888);
    g.fillRect(hamX - S, armY + hamY - 2 * S, 4 * S, S);
    g.lineStyle(1, 0x444444, 1);
    g.strokeRect(hamX - S, armY + hamY - 2 * S, 4 * S, 3 * S);

    // Neck
    g.fillStyle(0xffcc88);
    g.fillRect(-2 * S, -8 * S, 4 * S, 2 * S);

    // Head
    g.fillStyle(0xffcc88);
    g.fillRect(-4 * S, -14 * S, 8 * S, 7 * S);
    g.lineStyle(1, 0xcc9966, 0.5);
    g.strokeRect(-4 * S, -14 * S, 8 * S, 7 * S);

    // Sideburns / beard stubble
    g.fillStyle(0xdd5500);
    g.fillRect(-4 * S, -11 * S, S, 3 * S);
    g.fillRect(3 * S, -11 * S, S, 3 * S);
    g.fillRect(-3 * S, -9 * S, S, 2 * S);
    g.fillRect(2 * S, -9 * S, S, 2 * S);

    // Eyes
    g.fillStyle(0x222222);
    g.fillRect(-3 * S, -12 * S, S + 1, S + 1);
    g.fillRect(2 * S, -12 * S, S + 1, S + 1);
    // Eye whites
    g.fillStyle(0xffffff);
    g.fillRect(-3 * S, -12 * S, 2, 2);
    g.fillRect(2 * S, -12 * S, 2, 2);

    // Nose
    g.fillStyle(0xee9966);
    g.fillRect(-S, -10 * S, 2 * S, S);

    // Helmet — orange with yellow stripe
    g.fillStyle(0xdd5500);
    g.fillRect(-5 * S, -21 * S, 10 * S, 8 * S);
    // Helmet dome
    g.fillStyle(0xff6600);
    g.fillRect(-4 * S, -24 * S, 8 * S, 4 * S);
    g.fillStyle(0xff8833);
    g.fillRect(-3 * S, -25 * S, 6 * S, 2 * S);
    g.fillStyle(0xff9944);
    g.fillRect(-2 * S, -26 * S, 4 * S, S);
    // Helmet brim
    g.fillStyle(0xcc4400);
    g.fillRect(-6 * S, -16 * S, 12 * S, 2 * S);
    // Helmet stripe
    g.fillStyle(0xffdd00);
    g.fillRect(-S, -25 * S, 2 * S, 10 * S);
    // Visor slit
    g.fillStyle(0x221100);
    g.fillRect(-4 * S, -20 * S, 8 * S, 2 * S);
    g.lineStyle(1, 0x331100, 1);
    g.strokeRect(-5 * S, -21 * S, 10 * S, 8 * S);

    // Status effects
    if (this.agentData.status === 'done') {
      // Thumbs up
      g.fillStyle(0xffcc88);
      g.fillRect(-9 * S, -3 * S, 3 * S, 3 * S);
      g.fillRect(-10 * S, -4 * S, 2 * S, 2 * S);
      g.fillStyle(0x00ff88, 0.8);
      g.fillCircle(-8 * S, -4 * S, 6);
    }
    if (this.agentData.status === 'error') {
      // Red flicker
      if (Math.floor(frame * 0.05) % 2 === 0) {
        g.fillStyle(0xff2244, 0.4);
        g.fillRect(-6 * S, -26 * S, 12 * S, 36 * S);
      }
      // Smoke wisps
      g.fillStyle(0x888888, 0.3);
      g.fillCircle(-5 * S, -30 * S, 8);
      g.fillCircle(-3 * S, -35 * S, 6);
    }
  }

  private spawnMagicParticle(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = Phaser.Math.FloatBetween(0.5, 2);
    this.particles.push({
      x: 0,
      y: -20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      color: [0xcc44ff, 0xff88ff, 0xffffff, 0x8844ff][Phaser.Math.Between(0, 3)],
    });
  }

  update(delta: number): void {
    this.animTimer += delta;
    this.idleTimer += delta;

    // Walk cycle
    if (this.isMoving) {
      this.walkCycle += delta * 0.12;
    }

    // Advance animation frame
    if (this.animTimer > 180) {
      this.animTimer = 0;
      this.animFrame++;
    }

    // Spawn particles for orchestrating/working
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

    // Idle movement between waypoints
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

    this.drawParticles();
    this.drawSprite();
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

  private drawParticles(): void {
    const g = this.particleGfx;
    g.clear();
    for (const p of this.particles) {
      g.fillStyle(p.color, p.life);
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  }

  updateData(data: AgentData): void {
    this.agentData = data;
    const color = STATUS_COLORS[data.status] ?? 0xffffff;
    this.statusText.setText(data.status.toUpperCase());
    this.statusText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba);
  }

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
    this.tooltip = this.scene.add.container(this.x + 34, this.y - 40, [bg, ...texts]);
    this.tooltip.setDepth(300);
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
  }

  private showSpeechBubble(): void {
    if (this.speechBubble) return;
    const task = this.agentData.currentTask;
    let text: string;
    if (this.isPercival) {
      text = this.agentData.status === 'orchestrating'
        ? `Orquestando: ${task ?? '???'}`
        : this.agentData.status === 'thinking'
        ? '...pensando en el plan...'
        : '¡OASIS te necesita!';
    } else {
      text = this.agentData.status === 'working'
        ? `Forjando: ${task ?? '???'}`
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
    // Bubble tail
    bg.fillTriangle(20, 30, 30, 30, 25, 40);
    bg.strokeTriangle(20, 30, 30, 30, 25, 40);
    const txt = this.scene.add.text(8, 8, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#222222',
      wordWrap: { width: 164 },
    });
    this.speechBubble = this.scene.add.container(this.x - 24, this.y - 80, [bg, txt]);
    this.speechBubble.setDepth(350);
    this.scene.time.delayedCall(3000, () => {
      if (this.speechBubble) { this.speechBubble.destroy(); this.speechBubble = null; }
    });
  }
}
