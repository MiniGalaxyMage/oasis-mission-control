import Phaser from 'phaser';
import { HeartbeatData } from '../types';

export class HeartbeatPulse extends Phaser.GameObjects.Container {
  private heartGraphics!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private pulseTimer = 0;
  private beatPhase = 0;
  private hbData: HeartbeatData;

  constructor(scene: Phaser.Scene, x: number, y: number, hbData: HeartbeatData) {
    super(scene, x, y);
    this.hbData = hbData;
    this.build();
  }

  private build(): void {
    this.heartGraphics = this.scene.add.graphics();
    this.add(this.heartGraphics);
    this.drawHeart(1.0);

    this.labelText = this.scene.add.text(22, -4, 'HB: ok', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ff4488',
    });
    this.add(this.labelText);
  }

  private drawHeart(scale: number): void {
    const g = this.heartGraphics;
    g.clear();

    const s = scale;
    const S = 3 * s;
    const color = this.hbData.status === 'ok' ? 0xff2255 : 0xff8800;

    g.fillStyle(color);
    // Pixel heart: 8x7 grid scaled by S
    const pixels = [
      [0,1,1,0,0,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
      [0,0,0,0,0,0,0,0],
    ];
    pixels.forEach((row, ry) => {
      row.forEach((cell, rx) => {
        if (cell) g.fillRect((rx - 4) * S, (ry - 3) * S, S, S);
      });
    });
  }

  updateData(hbData: HeartbeatData): void {
    this.hbData = hbData;
    const ago = Math.floor((Date.now() - new Date(hbData.lastCheck).getTime()) / 60000);
    this.labelText.setText(`HB: ${ago}m`);
  }

  update(delta: number): void {
    this.pulseTimer += delta;
    // Beat every 1200ms: quick double-beat effect
    const period = 1200;
    const t = (this.pulseTimer % period) / period;
    let scale: number;
    if (t < 0.08) {
      scale = 1 + 0.4 * (t / 0.08);
    } else if (t < 0.16) {
      scale = 1.4 - 0.4 * ((t - 0.08) / 0.08);
    } else if (t < 0.24) {
      scale = 1 + 0.25 * ((t - 0.16) / 0.08);
    } else if (t < 0.32) {
      scale = 1.25 - 0.25 * ((t - 0.24) / 0.08);
    } else {
      scale = 1.0;
    }

    if (Math.floor(this.beatPhase) !== Math.floor(t * 10)) {
      this.beatPhase = t * 10;
      this.drawHeart(scale);
    }
  }
}
