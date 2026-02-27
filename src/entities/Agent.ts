import Phaser from 'phaser';
import { AgentData } from '../types';

interface WaypointSet {
  home: { x: number; y: number };
  wander: Array<{ x: number; y: number }>;
}

const WAYPOINTS: Record<string, WaypointSet> = {
  percival: {
    home: { x: 220, y: 280 },
    wander: [
      { x: 300, y: 370 },
      { x: 160, y: 340 },
      { x: 260, y: 430 },
    ],
  },
  'forge-alpha': {
    home: { x: 130, y: 440 },
    wander: [
      { x: 390, y: 390 },
      { x: 200, y: 370 },
      { x: 480, y: 450 },
    ],
  },
  sprite: {
    home: { x: 660, y: 260 },
    wander: [
      { x: 550, y: 360 },
      { x: 680, y: 420 },
      { x: 600, y: 300 },
    ],
  },
};

// Fallback para agentes desconocidos
const DEFAULT_WAYPOINTS: WaypointSet = {
  home: { x: 400, y: 350 },
  wander: [
    { x: 350, y: 300 },
    { x: 450, y: 400 },
    { x: 500, y: 300 },
  ],
};

export class Agent {
  private scene: Phaser.Scene;
  private data: AgentData;
  private spriteObj: Phaser.GameObjects.Image;
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
    this.spriteObj = this.createSprite();
    this.nameLabel = this.createNameLabel();
    this.statusLabel = this.createStatusLabel();
    this.setupInteraction();
    this.startMovementLoop();
  }

  private getTextureKey(): string {
    // Usa forge-working si está working, sino idle
    const id = this.data.id;
    if (id === 'forge-alpha' || id === 'forge-beta') {
      return this.data.status === 'working' ? 'forge-working' : 'forge-idle';
    }
    if (id === 'percival') return 'percival-idle';
    if (id === 'sprite') return 'sprite-idle';
    // fallback: intentar con el id directamente, si no existe usar percival
    return 'percival-idle';
  }

  private createSprite(): Phaser.GameObjects.Image {
    const { x, y } = this.getHomePosition();
    const tex = this.getTextureKey();
    // Los sprites de Gemini son 1024x1024 — escalar a ~64px de alto
    // 64 / 1024 = 0.0625
    const img = this.scene.add.image(x, y, tex);
    img.setScale(0.0625); // → 64px en pantalla
    img.setDepth(10);
    return img;
  }

  private createNameLabel(): Phaser.GameObjects.Text {
    const lbl = this.scene.add.text(
      this.spriteObj.x,
      this.spriteObj.y + 36,
      this.data.name,
      {
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }
    );
    lbl.setOrigin(0.5, 0);
    lbl.setDepth(11);
    return lbl;
  }

  private createStatusLabel(): Phaser.GameObjects.Text {
    const color = this.getStatusColor();
    const lbl = this.scene.add.text(
      this.spriteObj.x,
      this.spriteObj.y + 48,
      this.data.status,
      {
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        color,
        stroke: '#000000',
        strokeThickness: 1,
      }
    );
    lbl.setOrigin(0.5, 0);
    lbl.setDepth(11);
    return lbl;
  }

  private getStatusColor(): string {
    switch (this.data.status) {
      case 'working': return '#44ff88';
      case 'orchestrating': return '#ffdd44';
      case 'thinking': return '#88aaff';
      case 'error': return '#ff4444';
      case 'done': return '#aaaaaa';
      default: return '#cccccc';
    }
  }

  private getHomePosition(): { x: number; y: number } {
    if (this.data.status === 'working' || this.data.status === 'orchestrating') {
      return this.waypoints.home;
    }
    return this.waypoints.home;
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
      `${this.data.name}`,
      `Estado: ${this.data.status}`,
      `Tarea: ${truncate(task, 20)}`,
      `Modelo: ${this.data.model}`,
    ];

    const padding = 8;
    const lineHeight = 14;
    const boxWidth = 160;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(0, 0, boxWidth, boxHeight, 4);
    bg.lineStyle(1, 0x6666aa, 1);
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
      this.spriteObj.y - boxHeight - 10,
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
    // Espera inicial aleatoria para que no se muevan todos a la vez
    const initialDelay = Phaser.Math.Between(0, 3000);
    this.scene.time.delayedCall(initialDelay, () => {
      this.scheduleNextMove();
    });
  }

  private scheduleNextMove(): void {
    // Si está working/orchestrating, se queda en home
    if (this.data.status === 'working' || this.data.status === 'orchestrating') {
      this.moveToPoint(this.waypoints.home, () => {
        // Se queda quieto — comprueba de nuevo en 10s
        this.moveTimer = this.scene.time.delayedCall(10000, () => this.scheduleNextMove());
      });
      return;
    }

    // Idle: elige un waypoint aleatorio de wander
    const wander = this.waypoints.wander;
    this.waypointIndex = (this.waypointIndex + 1) % wander.length;
    const target = wander[this.waypointIndex];

    this.moveToPoint(target, () => {
      // Pausa 2-5 segundos antes del próximo movimiento
      const pause = Phaser.Math.Between(2000, 5000);
      this.moveTimer = this.scene.time.delayedCall(pause, () => this.scheduleNextMove());
    });
  }

  private moveToPoint(target: { x: number; y: number }, onComplete: () => void): void {
    if (this.isMoving) return;
    this.isMoving = true;

    // Duración proporcional a la distancia (mínimo 2s, máximo 4s)
    const dist = Phaser.Math.Distance.Between(
      this.spriteObj.x,
      this.spriteObj.y,
      target.x,
      target.y
    );
    const duration = Phaser.Math.Clamp(dist * 15, 2000, 4000);

    this.scene.tweens.add({
      targets: [this.spriteObj, this.nameLabel, this.statusLabel],
      x: {
        getStart: () => (this.spriteObj === this.scene.tweens.getTweensOf(this.spriteObj)[0]?.targets[0] ? this.spriteObj.x : this.spriteObj.x),
        getEnd: () => target.x,
      },
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Mover las labels siguiendo al sprite
        this.nameLabel.setPosition(this.spriteObj.x, this.spriteObj.y + 36);
        this.statusLabel.setPosition(this.spriteObj.x, this.spriteObj.y + 48);
        if (this.tooltip) {
          this.tooltip.setPosition(this.spriteObj.x - 80, this.spriteObj.y - 90);
        }
      },
      onComplete: () => {
        this.isMoving = false;
        onComplete();
      },
    });

    // Tween separado para Y (necesario para mover los tres objetos en X e Y independientemente)
    this.scene.tweens.add({
      targets: [this.spriteObj],
      y: target.y,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: [this.nameLabel],
      y: target.y + 36,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: [this.statusLabel],
      y: target.y + 48,
      duration,
      ease: 'Sine.easeInOut',
    });
  }

  update(data: AgentData): void {
    this.data = data;
    // Actualizar etiqueta de estado
    this.statusLabel.setText(data.status);
    this.statusLabel.setStyle({ color: this.getStatusColor() });
    // Actualizar textura si cambió
    const newTex = this.getTextureKey();
    if (this.spriteObj.texture.key !== newTex) {
      this.spriteObj.setTexture(newTex);
    }
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
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
