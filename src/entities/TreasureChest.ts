import Phaser from 'phaser';
import { PRData } from '../types';

/**
 * TreasureChest — cofre del tesoro. Si hay PRs mergeadas,
 * hace una animación de escala al hacer click.
 */
export class TreasureChest {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private mergedCount = 0;

  static readonly X = 680;
  static readonly Y = 500;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(TreasureChest.X, TreasureChest.Y);
    this.container.setDepth(8);
  }

  create(prs: PRData[]): void {
    this.mergedCount = prs.filter(p => p.status === 'merged').length;
    this.draw();
    this.setupInteraction();
  }

  private draw(): void {
    this.container.removeAll(true);

    const gfx = this.scene.add.graphics();
    const isOpen = this.mergedCount > 0;

    // Base del cofre
    gfx.fillStyle(0x5c3a1e);
    gfx.fillRect(-24, 4, 48, 28);

    // Tapa
    if (isOpen) {
      // Tapa abierta (rotada hacia atrás)
      gfx.fillStyle(0x7a5230);
      gfx.fillRect(-24, -16, 48, 20);
      gfx.lineStyle(2, 0xaa7744);
      gfx.strokeRect(-24, -16, 48, 20);
    } else {
      // Tapa cerrada
      gfx.fillStyle(0x7a5230);
      gfx.fillRect(-24, -12, 48, 16);
      gfx.lineStyle(2, 0xaa7744);
      gfx.strokeRect(-24, -12, 48, 16);
    }

    // Borde de la base
    gfx.lineStyle(2, 0xaa7744);
    gfx.strokeRect(-24, 4, 48, 28);

    // Cerradura
    gfx.fillStyle(0xddaa22);
    gfx.fillRect(-5, 10, 10, 10);
    gfx.fillCircle(0, 10, 5);

    // Bisagras
    gfx.fillStyle(0x888844);
    gfx.fillRect(-22, 2, 8, 6);
    gfx.fillRect(14, 2, 8, 6);

    // Destellos si está abierto
    if (isOpen) {
      gfx.fillStyle(0xffee22, 0.8);
      gfx.fillCircle(-8, -5, 3);
      gfx.fillCircle(8, -8, 2);
      gfx.fillCircle(0, -12, 4);
    }

    this.container.add(gfx);

    // Etiqueta con contador
    const label = this.scene.add.text(0, 36, `COFRE (${this.mergedCount} PR)`, {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: isOpen ? '#ffdd44' : '#887744',
    }).setOrigin(0.5, 0);
    this.container.add(label);
  }

  private setupInteraction(): void {
    const hitZone = this.scene.add.zone(0, 0, 50, 70).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      if (this.mergedCount > 0) {
        this.playOpenAnimation();
      }
    });
    hitZone.on('pointerover', () => {
      this.container.setScale(1.05);
    });
    hitZone.on('pointerout', () => {
      this.container.setScale(1.0);
    });
    this.container.add(hitZone);
  }

  private playOpenAnimation(): void {
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1.0, to: 1.3 },
      scaleY: { from: 1.0, to: 1.3 },
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  update(prs: PRData[]): void {
    const newCount = prs.filter(p => p.status === 'merged').length;
    if (newCount !== this.mergedCount) {
      this.mergedCount = newCount;
      this.draw();
    }
  }
}
