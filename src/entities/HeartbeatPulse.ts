import Phaser from 'phaser';
import { HeartbeatData } from '../types';

/**
 * HeartbeatPulse — cristal/gema que pulsa según el estado del heartbeat.
 * Verde = OK, Amarillo = warning, Rojo = error.
 */
export class HeartbeatPulse {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private pulseContainer: Phaser.GameObjects.Container;
  private statusText: Phaser.GameObjects.Text;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private status: HeartbeatData['status'] = 'ok';

  // Posición en la escena
  static readonly X = 120;
  static readonly Y = 540;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(8);

    this.pulseContainer = scene.add.container(HeartbeatPulse.X, HeartbeatPulse.Y);
    this.pulseContainer.setDepth(8);

    this.statusText = scene.add.text(
      HeartbeatPulse.X,
      HeartbeatPulse.Y + 22,
      'HEARTBEAT',
      {
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#44ff88',
      }
    ).setOrigin(0.5, 0).setDepth(9);
  }

  create(data: HeartbeatData): void {
    this.status = data.status;
    this.drawGem();
    this.startPulse();
  }

  private drawGem(): void {
    this.pulseContainer.removeAll(true);

    const color = this.getColor();
    const gfx = this.scene.add.graphics();

    // Diamante (rombo)
    gfx.fillStyle(color, 0.9);
    gfx.fillTriangle(-12, 0, 0, -18, 12, 0);
    gfx.fillTriangle(-12, 0, 0, 14, 12, 0);

    // Brillo
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillTriangle(-6, -4, 0, -14, 4, -4);

    // Borde
    gfx.lineStyle(1, this.getLightColor(), 0.8);
    gfx.strokeTriangle(-12, 0, 0, -18, 12, 0);
    gfx.strokeTriangle(-12, 0, 0, 14, 12, 0);

    this.pulseContainer.add(gfx);

    // Actualizar texto
    const label = this.status === 'ok' ? 'HB: OK' : this.status === 'warn' ? 'HB: WARN' : 'HB: ERR';
    const textColor = this.getTextColor();
    this.statusText.setText(label).setStyle({ color: textColor });
  }

  private startPulse(): void {
    if (this.pulseTween) {
      this.pulseTween.destroy();
    }

    const duration = this.status === 'ok' ? 1500 : this.status === 'warn' ? 800 : 400;

    this.pulseTween = this.scene.tweens.add({
      targets: this.pulseContainer,
      scaleX: { from: 1.0, to: 1.15 },
      scaleY: { from: 1.0, to: 1.15 },
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private getColor(): number {
    switch (this.status) {
      case 'ok': return 0x22cc66;
      case 'warn': return 0xddaa22;
      case 'error': return 0xcc2222;
      default: return 0x22cc66;
    }
  }

  private getLightColor(): number {
    switch (this.status) {
      case 'ok': return 0x88ffaa;
      case 'warn': return 0xffdd88;
      case 'error': return 0xff8888;
      default: return 0x88ffaa;
    }
  }

  private getTextColor(): string {
    switch (this.status) {
      case 'ok': return '#44ff88';
      case 'warn': return '#ffdd44';
      case 'error': return '#ff4444';
      default: return '#44ff88';
    }
  }

  update(data: HeartbeatData): void {
    if (data.status !== this.status) {
      this.status = data.status;
      this.drawGem();
      this.startPulse();
    }
  }
}
