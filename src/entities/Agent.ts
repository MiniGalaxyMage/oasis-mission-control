import Phaser from 'phaser';
import { AgentData } from '../types';

interface WaypointSet {
  home: { x: number; y: number };
  wander: Array<{ x: number; y: number }>;
}

/**
 * Waypoints ajustados al canvas 1200x800 (sala principal 950px de ancho).
 * Percival: zona central (mesa de mapas)
 * Forge:    zona izquierda (yunque/herrería)
 * Sprite:   zona derecha (caballete)
 */
const WAYPOINTS: Record<string, WaypointSet> = {
  percival: {
    home: { x: 460, y: 420 },
    wander: [
      { x: 380, y: 480 },
      { x: 540, y: 360 },
      { x: 350, y: 400 },
      { x: 510, y: 500 },
    ],
  },
  'forge-alpha': {
    home: { x: 170, y: 500 },
    wander: [
      { x: 240, y: 440 },
      { x: 130, y: 560 },
      { x: 280, y: 520 },
      { x: 190, y: 600 },
    ],
  },
  sprite: {
    home: { x: 740, y: 370 },
    wander: [
      { x: 800, y: 450 },
      { x: 670, y: 390 },
      { x: 850, y: 530 },
      { x: 720, y: 320 },
    ],
  },
};

const DEFAULT_WAYPOINTS: WaypointSet = {
  home: { x: 475, y: 450 },
  wander: [
    { x: 400, y: 380 },
    { x: 550, y: 500 },
    { x: 600, y: 380 },
  ],
};

/**
 * Imágenes estáticas recortadas de los sheets 1024x1024.
 * Dimensiones de cada recorte:
 *   percival-static: 185x306 → scale 0.29 ≈ 89px alto
 *   forge-static:    529x312 → scale 0.29 ≈ 90px alto
 *   sprite-static:   225x247 → scale 0.36 ≈ 89px alto
 */
const AGENT_IMAGE_CONFIG: Record<string, { key: string; scale: number }> = {
  percival:      { key: 'percival-static', scale: 0.29 },
  'forge-alpha': { key: 'forge-static',    scale: 0.29 },
  sprite:        { key: 'sprite-static',   scale: 0.36 },
};

export class Agent {
  private scene: Phaser.Scene;
  private data: AgentData;
  private imgObj: Phaser.GameObjects.Image;
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
    const config = AGENT_IMAGE_CONFIG[data.id] ?? AGENT_IMAGE_CONFIG['percival'];

    // Imagen estática (visible garantizado)
    this.imgObj = scene.add.image(x, y, config.key);
    this.imgObj.setScale(config.scale);
    this.imgObj.setDepth(10);
    this.imgObj.setOrigin(0.5, 1); // anclar en los pies

    // Labels debajo del personaje
    const labelY = y + 8;
    this.nameLabel = this.createLabel(x, labelY, data.name, '#ffdd44', '8px');
    this.statusLabel = this.createLabel(x, labelY + 16, data.status, this.getStatusColor(), '6px');

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
      strokeThickness: 3,
      backgroundColor: '#00000066',
      padding: { x: 3, y: 2 },
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
    this.imgObj.setInteractive({ useHandCursor: true });

    this.imgObj.on('pointerdown', () => this.showTooltip());
    this.imgObj.on('pointerover', () => {
      this.imgObj.setTint(0xddddff);
    });
    this.imgObj.on('pointerout', () => {
      this.imgObj.clearTint();
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
      this.imgObj.x - boxWidth / 2,
      this.imgObj.y - this.imgObj.displayHeight - boxHeight - 10,
      [bg, ...texts]
    );
    this.tooltip.setDepth(50);

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
    if (this.data.status === 'working' || this.data.status === 'orchestrating') {
      this.moveToPoint(this.waypoints.home, () => {
        this.moveTimer = this.scene.time.delayedCall(10000, () => this.scheduleNextMove());
      });
      return;
    }

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
      this.imgObj.x, this.imgObj.y,
      target.x, target.y
    );
    const duration = Phaser.Math.Clamp(dist * 18, 2500, 6000);

    // Flipear imagen según dirección
    if (target.x < this.imgObj.x) {
      this.imgObj.setFlipX(true);
    } else {
      this.imgObj.setFlipX(false);
    }

    this.scene.tweens.add({
      targets: this.imgObj,
      x: target.x,
      y: target.y,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.nameLabel.setPosition(this.imgObj.x, this.imgObj.y + 8);
        this.statusLabel.setPosition(this.imgObj.x, this.imgObj.y + 24);
        if (this.tooltip) {
          this.tooltip.setPosition(this.imgObj.x - 85, this.imgObj.y - this.imgObj.displayHeight - 60);
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
    this.imgObj.destroy();
    this.nameLabel.destroy();
    this.statusLabel.destroy();
  }
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
