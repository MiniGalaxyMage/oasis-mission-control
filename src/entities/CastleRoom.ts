import Phaser from 'phaser';

/**
 * CastleRoom — dibuja la habitación de castillo estilo Zelda ALTTP
 * usando Phaser.Graphics. Sin tilemaps, limpio y directo.
 */
export class CastleRoom {
  private scene: Phaser.Scene;

  // Colores de la habitación
  static readonly FLOOR_COLOR    = 0x3d3d5c;
  static readonly WALL_COLOR     = 0x2a2a42;
  static readonly WALL_TOP_COLOR = 0x1e1e32;
  static readonly BORDER_COLOR   = 0x4a4a6a;

  // Límites del espacio caminable (para los agentes)
  static readonly WALK_X_MIN = 60;
  static readonly WALK_X_MAX = 740;
  static readonly WALK_Y_MIN = 140;
  static readonly WALK_Y_MAX = 520;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const gfx = this.scene.add.graphics();

    // --- SUELO ---
    gfx.fillStyle(CastleRoom.FLOOR_COLOR);
    gfx.fillRect(0, 80, 800, 520);

    // --- PARED SUPERIOR (oscura, parece profundidad) ---
    gfx.fillStyle(CastleRoom.WALL_TOP_COLOR);
    gfx.fillRect(0, 0, 800, 80);

    // --- PARED INFERIOR ---
    gfx.fillStyle(CastleRoom.WALL_COLOR);
    gfx.fillRect(0, 570, 800, 30);

    // --- PAREDES LATERALES ---
    gfx.fillStyle(CastleRoom.WALL_COLOR);
    gfx.fillRect(0, 80, 30, 490);
    gfx.fillRect(770, 80, 30, 490);

    // --- BORDE SUPERIOR (línea decorativa) ---
    gfx.fillStyle(CastleRoom.BORDER_COLOR);
    gfx.fillRect(30, 78, 740, 4);

    // --- BALDOSAS DEL SUELO (grid sutil) ---
    gfx.lineStyle(1, 0x45456a, 0.3);
    const tileSize = 40;
    for (let x = 30; x <= 770; x += tileSize) {
      gfx.lineBetween(x, 82, x, 568);
    }
    for (let y = 82; y <= 568; y += tileSize) {
      gfx.lineBetween(30, y, 770, y);
    }

    // --- PUERTA EN PARED SUPERIOR ---
    gfx.fillStyle(0x0d0d1f);
    gfx.fillRect(350, 0, 100, 80);
    gfx.fillStyle(0x6b4c11);
    gfx.fillRect(355, 2, 90, 78);
    gfx.fillStyle(0x4a3208);
    gfx.fillRect(363, 10, 74, 68);

    // --- MARCOS DE LAS PAREDES LATERALES (decoración) ---
    gfx.lineStyle(2, CastleRoom.BORDER_COLOR, 0.6);
    gfx.strokeRect(32, 82, 26, 488);
    gfx.strokeRect(742, 82, 26, 488);
  }
}
