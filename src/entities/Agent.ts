import Phaser from 'phaser';
import { AgentData } from '../types';

interface WaypointSet {
  home: { x: number; y: number };
  wander: Array<{ x: number; y: number }>;
}

/**
 * Zonas de cada agente sobre el fondo castle-room-bg.
 * La imagen 1024x1024 se escala a 800x600 → factor ~0.78x / 0.585y
 *
 * Percival:   zona central (mesa de mapas)
 * Forge:      zona izquierda (yunque/herrería)
 * Sprite:     zona derecha (caballete)
 */
const WAYPOINTS: Record<string, WaypointSet> = {
  percival: {
    home: { x: 370, y: 320 },
    wander: [
      { x: 320, y: 370 },
      { x: 430, y: 280 },
      { x: 280, y: 310 },
      { x: 400, y: 400 },
    ],
  },
  'forge-alpha': {
    home: { x: 150, y: 400 },
    wander: [
      { x: 200, y: 350 },
      { x: 120, y: 450 },
      { x: 240, y: 420 },
      { x: 160, y: 480 },
    ],
  },
  sprite: {
    home: { x: 630, y: 290 },
    wander: [
      { x: 660, y: 360 },
      { x: 590, y: 310 },
      { x: 700, y: 420 },
      { x: 620, y: 250 },
    ],
  },
};

const DEFAULT_WAYPOINTS: WaypointSet = {
  home: { x: 400, y: 350 },
  wander: [
    { x: 350, y: 300 },
    { x: 450, y: 400 },
    { x: 500, y: 300 },
  ],
};

// Mapeo agent ID → spritesheet key → animación idle
const AGENT_SPRITE_CONFIG: Record<string, { sheet: string; animKey: string; scale: number }> = {
  percival:    { sheet: 'percival-sheet', animKey: 'percival-idle', scale: 0.27 },
  'forge-alpha': { sheet: 'forge-sheet',   animKey: 'forge-idle',    scale: 0.27 },
  sprite:      { sheet: 'sprite-sheet',  animKey: 'sprite-idle',   scale: 0.27 },
};

// scale 0.27 → 256 * 0.27 ≈ 69px — justo en el rango 60-80px pedido

export class Agent {
  private scene: Phaser.Scene;
  private data: AgentData;
  private spriteObj: Phaser.GameObjects.Sprite;
  private nameLabel: Phaser.GameObjects.Text;
  private statusLabel: Phaser.GameObjects.Text;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private isMoving = false;
  private waypointIndex = 0;
  private waypoints: WaypointSet;
  private moveTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, data: AgentData) {
    this.scene = scene;
    this.data = data;
    this.waypoints = WAYPOINTS[data.id] ?? DEFAULT_WAYPOINTS;

    const { x, y } = this.waypoints.home;
    const config = AGENT_SPRITE_CONFIG[data.id] ?? AGENT_SPRITE_CONFIG['percival'];

    // Crear Sprite (no Image) para poder usar animaciones
    this.spriteObj = scene.add.sprite(x, y, config.sheet);
    this.spriteObj.setScale(config.scale);
    this.spriteObj.setDepth(10);

    // Arrancar animación idle
    this.spriteObj.play(config.animKey);

    // Labels
    this.nameLabel = this.createLabel(x, y + 40, data.name, '#ffdd44', '8px');
    this.statusLabel = this.createLabel(x, y + 54, data.status, this.getStatusColor(), '6px');

    this.setupInteraction();
    this.startMovementLoop();
  }

  private createLabel(
    x: number,
    y: number,
    text: string,
    color: string,
    fontSize: string
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontSize,
      fontFamily: '"Press Start 2P", monospace',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(11);
  }

  private getStatusColor(): string {
    switch (this.data.status) {
      case 'working':       return '#44ff88';
      case 'orchestrating': return '#ffdd44';
      case 'thinking':      return '#88aaff';
      case 'error':         return '#ff4444';
      case 'done':          return '#aaaaaa';
      default:              return '#cccccc';
    }
  }

  private setupInteraction(): void {
    this.spriteObj.setInteractive({ useHandCursor: true });

    this.spriteObj.on('pointerdown', () => this.showTooltip());
    this.spriteObj.on('pointerover', () => {
      this.spriteObj.setTint(0xddddff);
    });
    this.spriteObj.on('pointerout', () => {
      this.spriteObj.clearTint();
    });
  }

  private showTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }

    const task = this.data.currentTask ?? 'idle';
    const lines = [
      this.data.name,
      `Estado: ${this.data.status}`,
      `Tarea: ${truncate(task, 20)}`,
      `Modelo: ${this.data.model}`,
    ];

    const padding = 8;
    const lineHeight = 14;
    const boxWidth = 170;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0d0d1f, 0.93);
    bg.fillRoundedRect(0, 0, boxWidth, boxHeight, 4);
    bg.lineStyle(1, 0x8866ff, 1);
    bg.strokeRoundedRect(0, 0, boxWidth, boxHeight, 4);

    const texts = lines.map((line, i) =>
      this.scene.add.text(padding, padding + i * lineHeight, line, {
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        color: i === 0 ? '#ffdd44' : '#ccccff',
      })
    );

    this.tooltip = this.scene.add.container(
      this.spriteObj.x - boxWidth / 2,
      this.spriteObj.y - boxHeight - 50,
      [bg, ...texts]
    );
    this.tooltip.setDepth(50);

    // Auto-cierre en 3s
    this.scene.time.delayedCall(3000, () => {
      if (this.tooltip) {
        this.tooltip.destroy();
        this.tooltip = null;
      }
    });
  }

  private startMovementLoop(): void {
    const initialDelay = Phaser.Math.Between(500, 4000);
    this.scene.time.delayedCall(initialDelay, () => this.scheduleNextMove());
  }

  private scheduleNextMove(): void {
    // Si está trabajando: volver a home y esperar
    if (this.data.status === 'working' || this.data.status === 'orchestrating') {
      this.moveToPoint(this.waypoints.home, () => {
        this.moveTimer = this.scene.time.delayedCall(10000, () => this.scheduleNextMove());
      });
      return;
    }

    // Idle: recorrer waypoints en orden cíclico
    const wander = this.waypoints.wander;
    this.waypointIndex = (this.waypointIndex + 1) % wander.length;
    const target = wander[this.waypointIndex];

    this.moveToPoint(target, () => {
      const pause = Phaser.Math.Between(2000, 5000);
      this.moveTimer = this.scene.time.delayedCall(pause, () => this.scheduleNextMove());
    });
  }

  private moveToPoint(target: { x: number; y: number }, onComplete: () => void): void {
    if (this.isMoving) return;
    this.isMoving = true;

    const dist = Phaser.Math.Distance.Between(
      this.spriteObj.x, this.spriteObj.y,
      target.x, target.y
    );
    const duration = Phaser.Math.Clamp(dist * 18, 2500, 5000);

    // Flipear sprite según dirección
    if (target.x < this.spriteObj.x) {
      this.spriteObj.setFlipX(true);
    } else {
      this.spriteObj.setFlipX(false);
    }

    // Un solo tween para sprite + labels (mueven x e y juntos)
    this.scene.tweens.add({
      targets: this.spriteObj,
      x: target.x,
      y: target.y,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.nameLabel.setPosition(this.spriteObj.x, this.spriteObj.y + 40);
        this.statusLabel.setPosition(this.spriteObj.x, this.spriteObj.y + 54);
        if (this.tooltip) {
          this.tooltip.setPosition(this.spriteObj.x - 85, this.spriteObj.y - 100);
        }
      },
      onComplete: () => {
        this.isMoving = false;
        onComplete();
      },
    });
  }

  update(data: AgentData): void {
    this.data = data;
    this.statusLabel.setText(data.status);
    this.statusLabel.setStyle({ color: this.getStatusColor() });
    this.nameLabel.setText(data.name);
  }

  destroy(): void {
    if (this.moveTimer) this.moveTimer.destroy();
    if (this.tooltip) this.tooltip.destroy();
    this.spriteObj.destroy();
    this.nameLabel.destroy();
    this.statusLabel.destroy();
  }
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
