import Phaser from 'phaser';
import type { AgentData } from '../types';

// ─── Constantes ─────────────────────────────────────────────────────────────

const CANVAS_W = 800;
const CANVAS_H = 600;

interface WorkPost {
  x: number;
  y: number;
}

const WORK_POSTS: Record<string, WorkPost> = {
  percival:    { x: CANVAS_W * 0.30, y: CANVAS_H * 0.55 },
  'forge-alpha': { x: CANVAS_W * 0.50, y: CANVAS_H * 0.60 },
  sprite:      { x: CANVAS_W * 0.70, y: CANVAS_H * 0.50 },
};

const WANDER_POINTS: Record<string, Array<{ x: number; y: number }>> = {
  percival: [
    { x: 160, y: 300 }, { x: 240, y: 420 }, { x: 320, y: 260 }, { x: 200, y: 370 },
  ],
  'forge-alpha': [
    { x: 360, y: 380 }, { x: 420, y: 450 }, { x: 500, y: 310 }, { x: 440, y: 480 },
  ],
  sprite: [
    { x: 580, y: 260 }, { x: 650, y: 400 }, { x: 720, y: 300 }, { x: 600, y: 460 },
  ],
};

const STATUS_COLORS: Record<string, number> = {
  idle: 0x4488ff,
  working: 0x44ff88,
  thinking: 0xffcc44,
  orchestrating: 0xff44cc,
  error: 0xff4444,
  done: 0x44ffff,
};

const STATUS_EMOJI: Record<string, string> = {
  idle: '💤',
  working: '⚙️',
  thinking: '🤔',
  orchestrating: '🎯',
  error: '❌',
  done: '✅',
};

// ─── Entidad Agente ──────────────────────────────────────────────────────────

interface AgentEntity {
  id: string;
  data: AgentData;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  glow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  statusIcon: Phaser.GameObjects.Text;
  bobbingTween: Phaser.Tweens.Tween | null;
  typingTween: Phaser.Tweens.Tween | null;
  wanderTimer: Phaser.Time.TimerEvent | null;
  wanderIndex: number;
}

// ─── Escena ──────────────────────────────────────────────────────────────────

export class CommandCenter extends Phaser.Scene {
  private agentEntities: Map<string, AgentEntity> = new Map();
  private tooltip: Phaser.GameObjects.Container | null = null;
  private pendingAgentData: AgentData[] | null = null;
  private sceneReady = false;

  constructor() {
    super({ key: 'CommandCenter' });
  }

  // ── Preload ────────────────────────────────────────────────────────────────

  preload(): void {
    this.load.image('room-bg', '/assets/room/castle-room-bg.png');

    this.load.image('percival-idle',   '/assets/sprites/percival-clean.png');
    this.load.image('percival-typing', '/assets/sprites/percival-typing-clean.png');
    this.load.image('forge-idle',      '/assets/sprites/forge-clean.png');
    this.load.image('forge-typing',    '/assets/sprites/forge-typing-clean.png');
    this.load.image('sprite-idle',     '/assets/sprites/sprite-clean.png');
    this.load.image('sprite-typing',   '/assets/sprites/sprite-typing-clean.png');
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  create(): void {
    // Fondo
    this.add.image(CANVAS_W / 2, CANVAS_H / 2, 'room-bg')
      .setDisplaySize(CANVAS_W, CANVAS_H)
      .setDepth(0);

    // Partículas de polvo ambiente
    this.createDustParticles();

    // Agentes iniciales
    const defaultAgents: AgentData[] = [
      { id: 'percival',    name: 'Percival',    status: 'idle', currentTask: null, model: 'opus' },
      { id: 'forge-alpha', name: 'Forge Alpha', status: 'idle', currentTask: null, model: 'sonnet' },
      { id: 'sprite',      name: 'Sprite',      status: 'idle', currentTask: null, model: 'gemini' },
    ];
    const initialData = this.pendingAgentData ?? defaultAgents;
    initialData.forEach(d => this.spawnAgent(d));

    // Click fuera de tooltip cierra tooltip
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.tooltip) {
        const tb = this.tooltip.getBounds();
        if (!tb.contains(pointer.x, pointer.y)) {
          this.tooltip.destroy();
          this.tooltip = null;
        }
      }
    });

    this.sceneReady = true;

    // Si llegaron datos antes de que la escena estuviera lista
    if (this.pendingAgentData) {
      this.updateAgents(this.pendingAgentData);
      this.pendingAgentData = null;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(): void {
    // Depth sort por Y
    this.agentEntities.forEach(entity => {
      const y = entity.sprite.y;
      entity.sprite.setDepth(10 + y);
      entity.shadow.setDepth(9 + y);
      entity.glow.setDepth(8 + y);
      entity.label.setDepth(11 + y);
      entity.statusIcon.setDepth(11 + y);
    });
  }

  // ── API pública ────────────────────────────────────────────────────────────

  updateAgents(agents: AgentData[]): void {
    if (!this.sceneReady) {
      this.pendingAgentData = agents;
      return;
    }

    agents.forEach(data => {
      if (this.agentEntities.has(data.id)) {
        this.refreshAgent(data);
      } else {
        this.spawnAgent(data);
      }
    });
  }

  // ── Spawn ──────────────────────────────────────────────────────────────────

  private spawnAgent(data: AgentData): void {
    const key = this.getSpriteKey(data);
    const wander = WANDER_POINTS[data.id] ?? WANDER_POINTS['percival'];
    const startPt = wander[0];

    // Sombra
    const shadow = this.add.ellipse(startPt.x, startPt.y + 28, 48, 14, 0x000000, 0.35);

    // Glow de estado
    const glowColor = STATUS_COLORS[data.status] ?? 0x4488ff;
    const glow = this.add.ellipse(startPt.x, startPt.y + 10, 64, 64, glowColor, 0.12);

    // Sprite
    const sprite = this.add.sprite(startPt.x, startPt.y, key)
      .setOrigin(0.5, 1)
      .setInteractive({ useHandCursor: true });

    // Label nombre
    const label = this.add.text(startPt.x, startPt.y + 10, data.name, {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Emoji de estado
    const statusIcon = this.add.text(startPt.x + label.width / 2 + 4, startPt.y + 10,
      STATUS_EMOJI[data.status] ?? '💤', { fontSize: '10px' })
      .setOrigin(0, 0);

    const entity: AgentEntity = {
      id: data.id,
      data,
      sprite,
      shadow,
      glow,
      label,
      statusIcon,
      bobbingTween: null,
      typingTween: null,
      wanderTimer: null,
      wanderIndex: 0,
    };

    this.agentEntities.set(data.id, entity);

    // Click → tooltip
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.showTooltip(entity);
    });

    // Estado inicial
    this.applyState(entity, data);
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  private refreshAgent(data: AgentData): void {
    const entity = this.agentEntities.get(data.id);
    if (!entity) return;

    const prevStatus = entity.data.status;
    entity.data = data;

    // Actualizar glow
    const glowColor = STATUS_COLORS[data.status] ?? 0x4488ff;
    entity.glow.setFillStyle(glowColor, 0.12);

    // Actualizar label
    entity.statusIcon.setText(STATUS_EMOJI[data.status] ?? '💤');

    if (prevStatus !== data.status) {
      this.applyState(entity, data);
    }
  }

  // ── State Machine ──────────────────────────────────────────────────────────

  private applyState(entity: AgentEntity, data: AgentData): void {
    // Limpiar tweens anteriores
    entity.bobbingTween?.stop();
    entity.typingTween?.stop();
    entity.wanderTimer?.remove();
    entity.bobbingTween = null;
    entity.typingTween = null;
    entity.wanderTimer = null;

    const isWorking = data.status === 'working' || data.status === 'thinking' || data.status === 'orchestrating';

    if (isWorking) {
      this.enterWorkingState(entity);
    } else {
      this.enterIdleState(entity);
    }
  }

  private enterWorkingState(entity: AgentEntity): void {
    const post = WORK_POSTS[entity.id] ?? { x: 400, y: 350 };

    // Mover al puesto con tween
    const dist = Phaser.Math.Distance.Between(entity.sprite.x, entity.sprite.y, post.x, post.y);
    const duration = (dist / 100) * 1000;

    this.tweens.add({
      targets: [entity.sprite, entity.shadow, entity.glow, entity.label, entity.statusIcon],
      x: (target: Phaser.GameObjects.GameObject) => {
        if (target === entity.shadow) return post.x;
        if (target === entity.glow) return post.x;
        if (target === entity.label) return post.x;
        if (target === entity.statusIcon) return post.x + entity.label.width / 2 + 4;
        return post.x;
      },
      y: (target: Phaser.GameObjects.GameObject) => {
        if (target === entity.shadow) return post.y + 28;
        if (target === entity.glow) return post.y + 10;
        if (target === entity.label) return post.y + 10;
        if (target === entity.statusIcon) return post.y + 10;
        return post.y;
      },
      duration: Math.max(duration, 400),
      ease: 'Sine.InOut',
      onComplete: () => {
        // Cambiar a sprite typing
        const typingKey = this.getTypingKey(entity.data);
        entity.sprite.setTexture(typingKey);

        // Tween de tecleo sutil
        entity.typingTween = this.tweens.add({
          targets: entity.sprite,
          scaleX: { from: 0.98, to: 1.02 },
          duration: 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      },
    });
  }

  private enterIdleState(entity: AgentEntity): void {
    // Sprite idle
    entity.sprite.setTexture(this.getSpriteKey(entity.data));
    entity.sprite.setScale(1, 1);

    // Bobbing tween
    entity.bobbingTween = this.tweens.add({
      targets: entity.sprite,
      y: '-=2',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Pulso sombra
    this.tweens.add({
      targets: entity.shadow,
      scaleX: { from: 1, to: 0.85 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Iniciar deambulado
    this.scheduleWander(entity);
  }

  private scheduleWander(entity: AgentEntity): void {
    const pauseTime = Phaser.Math.Between(3000, 7000);
    entity.wanderTimer = this.time.delayedCall(pauseTime, () => {
      this.doWander(entity);
    });
  }

  private doWander(entity: AgentEntity): void {
    // Solo si sigue idle
    if (entity.data.status !== 'idle' && entity.data.status !== 'done' && entity.data.status !== 'error') return;

    const wander = WANDER_POINTS[entity.id] ?? WANDER_POINTS['percival'];
    entity.wanderIndex = (entity.wanderIndex + 1) % wander.length;
    const target = wander[entity.wanderIndex];

    const dist = Phaser.Math.Distance.Between(entity.sprite.x, entity.sprite.y, target.x, target.y);
    const duration = (dist / 80) * 1000;

    // Mover sprite + label + shadow + glow
    this.tweens.add({
      targets: entity.sprite,
      x: target.x,
      y: target.y,
      duration,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: entity.shadow,
      x: target.x,
      y: target.y + 28,
      duration,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: entity.glow,
      x: target.x,
      y: target.y + 10,
      duration,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: entity.label,
      x: target.x,
      y: target.y + 10,
      duration,
      ease: 'Sine.InOut',
      onComplete: () => this.scheduleWander(entity),
    });
    this.tweens.add({
      targets: entity.statusIcon,
      x: target.x + entity.label.width / 2 + 4,
      y: target.y + 10,
      duration,
      ease: 'Sine.InOut',
    });
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────

  private showTooltip(entity: AgentEntity): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }

    const { data, sprite } = entity;
    const lines = [
      `${data.name}`,
      `Estado: ${data.status}`,
      `Modelo: ${data.model}`,
      `Tarea: ${data.currentTask ? data.currentTask.slice(0, 28) : 'ninguna'}`,
    ];

    const padding = 8;
    const lineH = 14;
    const w = 200;
    const h = lines.length * lineH + padding * 2;

    let tx = sprite.x + 36;
    let ty = sprite.y - 80;
    if (tx + w > CANVAS_W - 10) tx = sprite.x - w - 10;
    if (ty < 10) ty = 10;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.92);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(1, STATUS_COLORS[data.status] ?? 0x4488ff, 1);
    bg.strokeRoundedRect(0, 0, w, h, 6);

    const texts: Phaser.GameObjects.Text[] = lines.map((line, i) =>
      this.add.text(padding, padding + i * lineH, line, {
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        color: i === 0 ? '#ffdd44' : '#ccccff',
      })
    );

    this.tooltip = this.add.container(tx, ty, [bg, ...texts]);
    this.tooltip.setDepth(999);
  }

  // ── Partículas ─────────────────────────────────────────────────────────────

  private createDustParticles(): void {
    // Partículas manuales: pequeños cuadros que flotan
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(30, CANVAS_W - 30);
      const y = Phaser.Math.Between(50, CANVAS_H - 50);
      const size = Phaser.Math.Between(1, 3);

      const dust = this.add.rectangle(x, y, size, size, 0xffffff, Phaser.Math.FloatBetween(0.05, 0.18));
      dust.setDepth(5);

      // Float up and fade
      this.tweens.add({
        targets: dust,
        y: y - Phaser.Math.Between(40, 120),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 9000),
        delay: Phaser.Math.Between(0, 5000),
        ease: 'Sine.InOut',
        repeat: -1,
        yoyo: false,
        onRepeat: () => {
          dust.setPosition(
            Phaser.Math.Between(30, CANVAS_W - 30),
            Phaser.Math.Between(CANVAS_H * 0.5, CANVAS_H - 50)
          );
          dust.setAlpha(Phaser.Math.FloatBetween(0.05, 0.18));
        },
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getSpriteKey(data: AgentData): string {
    const base = data.id === 'forge-alpha' ? 'forge' : data.id;
    return `${base}-idle`;
  }

  private getTypingKey(data: AgentData): string {
    const base = data.id === 'forge-alpha' ? 'forge' : data.id;
    return `${base}-typing`;
  }
}
