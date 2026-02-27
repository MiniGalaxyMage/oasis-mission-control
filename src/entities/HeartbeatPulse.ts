import Phaser from 'phaser';
import { HeartbeatData } from '../types';

/**
 * Cristal de heartbeat — gema mágica en la pared que pulsa según el estado del sistema.
 * Plain class (no Container) — dibuja directamente en la escena.
 */
export class HeartbeatPulse {
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  private hbData: HeartbeatData;
  private gfx!: Phaser.GameObjects.Graphics;
  private glowGfx!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private timer = 0;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private zone!: Phaser.GameObjects.Zone;
  private depth = 6;

  constructor(scene: Phaser.Scene, x: number, y: number, data: HeartbeatData) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hbData = data;

    this.glowGfx = scene.add.graphics().setDepth(this.depth);
    this.gfx = scene.add.graphics().setDepth(this.depth + 1);
    this.labelText = scene.add.text(x, y + 34, '♥ PULSO', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#cc4488',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(this.depth + 1);

    // Interactive zone
    this.zone = scene.add.zone(x, y, 44, 70).setInteractive({ useHandCursor: true }).setDepth(this.depth + 2);
    this.zone.on('pointerover', () => {
      scene.input.setDefaultCursor('pointer');
      this.showTooltip();
    });
    this.zone.on('pointerout', () => {
      scene.input.setDefaultCursor('default');
      this.hideTooltip();
    });

    this.drawCrystalBase();
  }

  setDepth(d: number): this {
    this.depth = d;
    this.glowGfx.setDepth(d);
    this.gfx.setDepth(d + 1);
    this.labelText.setDepth(d + 1);
    return this;
  }

  private baseColor(): number {
    if (this.hbData.status === 'ok') return 0x44eebb;
    if (this.hbData.status === 'warn') return 0xffcc00;
    return 0xff3344;
  }

  private drawCrystalBase(): void {
    const { x, y } = this;
    const g = this.gfx;
    // Wall mount
    g.fillStyle(0x3a2010);
    g.fillRect(x - 14, y - 32, 28, 8);
    g.lineStyle(1, 0x1a0f05, 1);
    g.strokeRect(x - 14, y - 32, 28, 8);
    g.fillStyle(0x777755);
    g.fillCircle(x - 10, y - 28, 3);
    g.fillCircle(x + 10, y - 28, 3);
  }

  update(delta: number): void {
    this.timer += delta * 0.003;
    const color = this.baseColor();
    const status = this.hbData.status;
    const { x, y } = this;

    const pulseSpeed = status === 'ok' ? 2 : status === 'warn' ? 3.5 : 5.5;
    const pulse = 0.5 + 0.5 * Math.sin(this.timer * pulseSpeed);
    const glowRadius = 28 + 18 * pulse;

    // Glow
    const gg = this.glowGfx;
    gg.clear();
    gg.fillStyle(color, 0.06 * pulse);
    gg.fillCircle(x, y, glowRadius + 18);
    gg.fillStyle(color, 0.12 * pulse);
    gg.fillCircle(x, y, glowRadius);
    gg.fillStyle(color, 0.22 * pulse);
    gg.fillCircle(x, y, glowRadius * 0.45);

    // Crystal body
    const cg = this.gfx;
    cg.clear();
    this.drawCrystalBase();

    // Crystal outer shape (5-sided gem = 2 triangles + 1 quad)
    cg.fillStyle(color);
    // Bottom point to sides
    cg.fillTriangle(x, y + 28, x - 13, y + 2, x + 13, y + 2);
    // Upper body (rectangle-ish)
    cg.fillRect(x - 13, y - 22, 26, 24);

    // Inner bright face
    cg.fillStyle(0xffffff, 0.28 + 0.18 * pulse);
    cg.fillTriangle(x, y + 12, x - 8, y - 4, x + 8, y - 4);
    cg.fillRect(x - 8, y - 18, 16, 14);

    // Facet lines
    cg.lineStyle(1, 0xffffff, 0.4);
    cg.lineBetween(x, y + 28, x - 13, y + 2);
    cg.lineBetween(x, y + 28, x + 13, y + 2);
    cg.lineBetween(x - 13, y + 2, x - 7, y - 22);
    cg.lineBetween(x + 13, y + 2, x + 7, y - 22);
    cg.lineBetween(x - 7, y - 22, x + 7, y - 22);
    // Center divider
    cg.lineBetween(x, y + 28, x, y - 22);

    // Sparkle cross
    cg.fillStyle(0xffffff, 0.6 + 0.4 * pulse);
    cg.fillRect(x - 2, y - 10, 4, 4);
    cg.fillRect(x - 1, y - 14, 2, 8);
    cg.fillRect(x - 4, y - 8, 8, 2);

    // Status dot
    const dotColor = status === 'ok' ? 0x00ff88 : status === 'warn' ? 0xffcc00 : 0xff2244;
    cg.fillStyle(dotColor);
    cg.fillCircle(x + 18, y - 24, 4);
    cg.fillStyle(0xffffff, 0.6);
    cg.fillCircle(x + 17, y - 25, 2);

    // Label color
    const labelColor = status === 'ok' ? '#44eebb' : status === 'warn' ? '#ffcc00' : '#ff3344';
    this.labelText.setColor(labelColor);
  }

  updateData(data: HeartbeatData): void {
    this.hbData = data;
  }

  private showTooltip(): void {
    if (this.tooltip) return;
    const { x, y } = this;
    const lastCheck = new Date(this.hbData.lastCheck);
    const ago = Math.round((Date.now() - lastCheck.getTime()) / 60000);
    const lines = [
      `Estado: ${this.hbData.status.toUpperCase()}`,
      `Check: ${ago < 999 ? ago + 'm atrás' : 'desconocido'}`,
    ];
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.95);
    bg.lineStyle(2, this.baseColor());
    bg.fillRoundedRect(0, 0, 180, lines.length * 14 + 12, 4);
    bg.strokeRoundedRect(0, 0, 180, lines.length * 14 + 12, 4);
    const texts = lines.map((l, i) =>
      this.scene.add.text(8, 6 + i * 14, l, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: Phaser.Display.Color.IntegerToColor(this.baseColor()).rgba,
      })
    );
    this.tooltip = this.scene.add.container(x + 26, y - 20, [bg, ...texts]).setDepth(300);
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
  }
}
