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

export class Agent extends Phaser.GameObjects.Container {
  private agentData: AgentData;
  private spriteGraphics!: Phaser.GameObjects.Graphics;
  private statusDot!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private animTimer = 0;
  private animFrame = 0;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private isPercival: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, data: AgentData) {
    super(scene, x, y);
    this.agentData = data;
    this.isPercival = data.id === 'percival';
    this.buildSprite();
    this.buildUI();
    this.setInteractive(new Phaser.Geom.Rectangle(-44, -44, 88, 110), Phaser.Geom.Rectangle.Contains);
    this.on('pointerover', this.showTooltip, this);
    this.on('pointerout', this.hideTooltip, this);
    // added to scene via scene.add.existing elsewhere or from CommandCenter
  }

  private buildSprite(): void {
    this.spriteGraphics = this.scene.add.graphics();
    this.add(this.spriteGraphics);
    this.drawSprite(0);
  }

  private drawSprite(frame: number): void {
    const g = this.spriteGraphics;
    g.clear();
    const S = 4; // pixel scale

    if (this.isPercival) {
      this.drawPercival(g, S, frame);
    } else {
      this.drawForge(g, S, frame);
    }
  }

  // Percival: mago/hacker con gafas, predominante púrpura
  private drawPercival(g: Phaser.GameObjects.Graphics, S: number, frame: number): void {
    const bobY = frame % 2 === 0 ? 0 : 1;

    // Robe body — púrpura oscuro
    g.fillStyle(0x6622aa);
    g.fillRect(-5 * S, 2 * S + bobY, 10 * S, 8 * S);

    // Robe hem
    g.fillStyle(0x8833cc);
    g.fillRect(-6 * S, 9 * S + bobY, 12 * S, 2 * S);

    // Head — skin tone
    g.fillStyle(0xffcc99);
    g.fillRect(-4 * S, -7 * S + bobY, 8 * S, 6 * S);

    // Wizard hat — dark purple
    g.fillStyle(0x3d1168);
    g.fillRect(-3 * S, -14 * S + bobY, 6 * S, 8 * S);
    g.fillRect(-5 * S, -7 * S + bobY, 10 * S, 2 * S);

    // Hat star ✦
    g.fillStyle(0xffdd00);
    g.fillRect(-1 * S, -13 * S + bobY, 2 * S, 2 * S);

    // Glasses
    g.fillStyle(0x00ccff);
    g.fillRect(-4 * S, -5 * S + bobY, 3 * S, 2 * S);
    g.fillRect(1 * S, -5 * S + bobY, 3 * S, 2 * S);
    g.fillStyle(0x888888);
    g.fillRect(-1 * S, -4 * S + bobY, 2 * S, 1 * S); // bridge

    // Arms
    g.fillStyle(0x6622aa);
    g.fillRect(-8 * S, 2 * S + bobY, 3 * S, 6 * S);
    g.fillRect(5 * S, 2 * S + bobY, 3 * S, 6 * S);

    // Wand (right hand) — yellow tip
    g.fillStyle(0x885500);
    g.fillRect(7 * S, 2 * S + bobY, 2 * S, 8 * S);
    g.fillStyle(0xffdd00);
    g.fillRect(7 * S, 1 * S + bobY, 2 * S, 2 * S);

    // Boots
    g.fillStyle(0x332255);
    g.fillRect(-5 * S, 10 * S + bobY, 4 * S, 3 * S);
    g.fillRect(1 * S, 10 * S + bobY, 4 * S, 3 * S);

    // Thinking frame: question marks
    if (this.agentData.status === 'thinking' && frame % 4 < 2) {
      g.fillStyle(0xffdd00);
      g.fillRect(-8 * S, -12 * S, 2 * S, 2 * S);
      g.fillRect(6 * S, -10 * S, 2 * S, 2 * S);
    }

    // Orchestrating: magic sparkles
    if (this.agentData.status === 'orchestrating' && frame % 4 === 0) {
      g.fillStyle(0xff88ff);
      g.fillRect(-10 * S, -8 * S, 2 * S, 2 * S);
      g.fillRect(8 * S, -6 * S, 2 * S, 2 * S);
    }
  }

  // Forge: herrero/constructor, predominante naranja
  private drawForge(g: Phaser.GameObjects.Graphics, S: number, frame: number): void {
    const workBob = this.agentData.status === 'working' ? (frame % 4 < 2 ? 0 : 2) : 0;

    // Body — naranja
    g.fillStyle(0xee6600);
    g.fillRect(-5 * S, 1 * S + workBob, 10 * S, 8 * S);

    // Chest armor plate
    g.fillStyle(0xcc4400);
    g.fillRect(-4 * S, 2 * S + workBob, 8 * S, 5 * S);

    // Head
    g.fillStyle(0xffcc99);
    g.fillRect(-4 * S, -6 * S + workBob, 8 * S, 6 * S);

    // Hard hat
    g.fillStyle(0xffaa00);
    g.fillRect(-5 * S, -9 * S + workBob, 10 * S, 4 * S);
    g.fillRect(-4 * S, -13 * S + workBob, 8 * S, 5 * S);

    // Hat brim
    g.fillStyle(0xff8800);
    g.fillRect(-6 * S, -8 * S + workBob, 12 * S, 2 * S);

    // Eyes
    g.fillStyle(0x222222);
    g.fillRect(-3 * S, -4 * S + workBob, 2 * S, 2 * S);
    g.fillRect(1 * S, -4 * S + workBob, 2 * S, 2 * S);

    // Arms
    g.fillStyle(0xee6600);
    g.fillRect(-8 * S, 2 * S + workBob, 3 * S, 5 * S);
    g.fillRect(5 * S, 2 * S + workBob, 3 * S, 5 * S);

    // Hammer (right hand)
    g.fillStyle(0x888888);
    g.fillRect(7 * S, 0 * S + workBob - (this.agentData.status === 'working' ? frame % 2 * 3 : 0), 2 * S, 7 * S);
    g.fillStyle(0x555555);
    g.fillRect(6 * S, -1 * S + workBob - (this.agentData.status === 'working' ? frame % 2 * 3 : 0), 4 * S, 3 * S);

    // Boots
    g.fillStyle(0x553311);
    g.fillRect(-5 * S, 9 * S + workBob, 4 * S, 3 * S);
    g.fillRect(1 * S, 9 * S + workBob, 4 * S, 3 * S);

    // Done: thumbs up
    if (this.agentData.status === 'done') {
      g.fillStyle(0x00ff88);
      g.fillRect(-8 * S, 1 * S, 2 * S, 3 * S);
      g.fillRect(-9 * S, 0, 2 * S, 2 * S);
    }

    // Error: red blink
    if (this.agentData.status === 'error' && frame % 4 < 2) {
      g.fillStyle(0xff2244, 0.6);
      g.fillRect(-5 * S, -13 * S, 10 * S, 26 * S);
    }
  }

  private buildUI(): void {
    const color = STATUS_COLORS[this.agentData.status] ?? 0xffffff;

    // Card background
    const card = this.scene.add.graphics();
    card.fillStyle(0x111122, 0.9);
    card.lineStyle(2, color, 1);
    card.fillRoundedRect(-48, -55, 96, 115, 4);
    card.strokeRoundedRect(-48, -55, 96, 115, 4);
    this.add(card);
    this.sendToBack(card);

    // Status dot
    this.statusDot = this.scene.add.graphics();
    this.add(this.statusDot);
    this.updateStatusDot();

    // Name
    this.nameText = this.scene.add.text(0, 48, this.agentData.name, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(this.nameText);

    // Status
    this.statusText = this.scene.add.text(0, 58, this.agentData.status.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(this.statusText);
  }

  private updateStatusDot(): void {
    const color = STATUS_COLORS[this.agentData.status] ?? 0xffffff;
    this.statusDot.clear();
    this.statusDot.fillStyle(color);
    this.statusDot.fillCircle(30, -40, 5);
  }

  update(delta: number): void {
    this.animTimer += delta;
    if (this.animTimer > 300) {
      this.animTimer = 0;
      this.animFrame++;
      this.drawSprite(this.animFrame);
    }

    // Pulsing status dot
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.003);
    this.statusDot.setAlpha(pulse);
  }

  updateData(data: AgentData): void {
    this.agentData = data;
    this.updateStatusDot();
    const color = STATUS_COLORS[data.status] ?? 0xffffff;
    this.statusText.setText(data.status.toUpperCase());
    this.statusText.setColor(Phaser.Display.Color.IntegerToColor(color).rgba);
  }

  private showTooltip(): void {
    if (this.tooltip) return;

    const lines = [
      `ID: ${this.agentData.id}`,
      `Modelo: ${this.agentData.model}`,
      `Tarea: ${this.agentData.currentTask ?? 'ninguna'}`,
      `Estado: ${this.agentData.status}`,
    ];

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.95);
    bg.lineStyle(1, 0x00ccff);
    bg.fillRoundedRect(0, 0, 180, lines.length * 14 + 10, 4);
    bg.strokeRoundedRect(0, 0, 180, lines.length * 14 + 10, 4);

    const texts = lines.map((line, i) =>
      this.scene.add.text(8, 6 + i * 14, line, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#00ccff',
      })
    );

    this.tooltip = this.scene.add.container(this.x + 52, this.y - 30, [bg, ...texts]);
    this.tooltip.setDepth(200);
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }
}
