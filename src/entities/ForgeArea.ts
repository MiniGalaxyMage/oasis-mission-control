import Phaser from 'phaser';

/**
 * ForgeArea — zona de herrería en la esquina inferior izquierda.
 * Dibujada con Phaser.Graphics + imagen del yunque.
 */
export class ForgeArea {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const gfx = this.scene.add.graphics();

    // Plataforma / base de piedra
    gfx.fillStyle(0x2a2042);
    gfx.fillRect(60, 460, 140, 80);
    gfx.lineStyle(2, 0x5a4a7a);
    gfx.strokeRect(60, 460, 140, 80);

    // Fuego de la forja (círculos naranjas)
    gfx.fillStyle(0xff6600, 0.8);
    gfx.fillCircle(80, 475, 8);
    gfx.fillStyle(0xffaa00, 0.9);
    gfx.fillCircle(80, 475, 5);
    gfx.fillStyle(0xffee00);
    gfx.fillCircle(80, 475, 2);

    // Animación de parpadeo del fuego
    const fireGfx = this.scene.add.graphics();
    fireGfx.setDepth(5);
    this.scene.tweens.add({
      targets: fireGfx,
      alpha: { from: 0.5, to: 1.0 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // Yunque (imagen)
    if (this.scene.textures.exists('anvil')) {
      const anvil = this.scene.add.image(130, 488, 'anvil');
      anvil.setScale(0.14);
      anvil.setDepth(6);
    } else {
      // Fallback: rectángulo estilizado
      gfx.fillStyle(0x444444);
      gfx.fillRect(110, 480, 50, 20);
      gfx.fillRect(120, 472, 30, 10);
    }

    // Etiqueta
    this.scene.add.text(130, 544, 'HERRERÍA', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#aa8844',
    }).setOrigin(0.5, 0).setDepth(7);
  }
}
