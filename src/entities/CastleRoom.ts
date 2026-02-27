import Phaser from 'phaser';

export interface RoomLayout {
  W: number;
  H: number;
  floorY: number;       // Y where floor starts
  wallTopY: number;     // Y of top of back wall
  smithyX: number;      // center X of smithy zone
  smithyY: number;      // Y of smithy floor level
  tableX: number;       // strategy table center X
  tableY: number;       // table Y
  questBoardX: number;  // quest board center X (on wall)
  questBoardY: number;
  scrollsX: number;     // PR scrolls center X (on wall)
  scrollsY: number;
  chestX: number;
  chestY: number;
  gemX: number;         // heartbeat gem
  gemY: number;
  torch1X: number;
  torch2X: number;
  torchY: number;
}

interface Torch {
  x: number;
  y: number;
  timer: number;
}

export class CastleRoom {
  private scene: Phaser.Scene;
  public layout: RoomLayout;
  private torches: Torch[] = [];
  private torchGfx!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W = scene.scale.width;
    const H = scene.scale.height;

    const floorY = Math.floor(H * 0.44);
    const wallTopY = Math.floor(H * 0.06);
    const torchY = wallTopY + Math.floor((floorY - wallTopY) * 0.58);

    this.layout = {
      W, H, floorY, wallTopY,
      smithyX: Math.floor(W * 0.14),
      smithyY: Math.floor(H * 0.76),
      tableX: Math.floor(W * 0.5),
      tableY: Math.floor(H * 0.70),
      questBoardX: Math.floor(W * 0.73),
      questBoardY: wallTopY + Math.floor((floorY - wallTopY) * 0.38),
      scrollsX: Math.floor(W * 0.27),
      scrollsY: wallTopY + Math.floor((floorY - wallTopY) * 0.38),
      chestX: Math.floor(W * 0.87),
      chestY: Math.floor(H * 0.83),
      gemX: Math.floor(W * 0.93),
      gemY: wallTopY + Math.floor((floorY - wallTopY) * 0.35),
      torch1X: Math.floor(W * 0.38),
      torch2X: Math.floor(W * 0.62),
      torchY,
    };

    this.drawRoom();
  }

  private drawRoom(): void {
    const { W, H, floorY, wallTopY } = this.layout;
    this.drawCeiling(W, wallTopY);
    this.drawWall(W, floorY, wallTopY);
    this.drawFloor(W, H, floorY);
    this.drawCarpet(W, H, floorY);
    this.drawWindow(W * 0.5, wallTopY + (floorY - wallTopY) * 0.32, floorY, wallTopY);
    this.drawTorchBrackets();
    this.drawStrategyTable();
    this.drawBaseboards(W, floorY);
    // Torch animated graphics layer
    this.torches = [
      { x: this.layout.torch1X, y: this.layout.torchY, timer: 0 },
      { x: this.layout.torch2X, y: this.layout.torchY, timer: Math.PI },
      { x: W * 0.1, y: this.layout.torchY, timer: Math.PI * 0.7 },
      { x: W * 0.9, y: this.layout.torchY, timer: Math.PI * 1.3 },
    ];
    this.torchGfx = this.scene.add.graphics().setDepth(4);
  }

  private drawCeiling(W: number, wallTopY: number): void {
    const g = this.scene.add.graphics().setDepth(0);
    g.fillStyle(0x16100a);
    g.fillRect(0, 0, W, wallTopY);
    // Stone blocks
    g.lineStyle(1, 0x221a12, 1);
    const bW = 64, bH = 28;
    for (let row = 0; row * bH <= wallTopY + bH; row++) {
      const offset = row % 2 === 0 ? 0 : bW / 2;
      for (let col = -1; col * bW <= W + bW; col++) {
        g.strokeRect(col * bW + offset, row * bH, bW, bH);
      }
    }
  }

  private drawWall(W: number, floorY: number, wallTopY: number): void {
    const g = this.scene.add.graphics().setDepth(0);
    // Stone wall, warm amber-gray
    g.fillStyle(0x3d2b1a);
    g.fillRect(0, wallTopY, W, floorY - wallTopY);
    // Stone blocks
    const bW = 72, bH = 36;
    g.lineStyle(1, 0x2a1a0f, 0.9);
    for (let row = 0; row * bH <= (floorY - wallTopY + bH); row++) {
      const offset = row % 2 === 0 ? 0 : bW / 2;
      for (let col = -1; col * bW <= W + bW; col++) {
        g.strokeRect(col * bW + offset, wallTopY + row * bH, bW, bH);
      }
    }
    // Ambient torch glow gradient on wall (left/right)
    const glow = this.scene.add.graphics().setDepth(1);
    // Left wall torch area
    for (let i = 0; i < 60; i++) {
      glow.fillStyle(0xff8800, (60 - i) / 60 * 0.06);
      glow.fillRect(0, wallTopY, i, floorY - wallTopY);
    }
    // Right wall torch area
    for (let i = 0; i < 60; i++) {
      glow.fillStyle(0xff8800, i / 60 * 0.06);
      glow.fillRect(W - 60, wallTopY, i, floorY - wallTopY);
    }
  }

  private drawFloor(W: number, H: number, floorY: number): void {
    const g = this.scene.add.graphics().setDepth(0);
    const tileSize = 60;
    for (let row = 0; row * tileSize <= H - floorY + tileSize; row++) {
      for (let col = 0; col * tileSize <= W; col++) {
        const tX = col * tileSize;
        const tY = floorY + row * tileSize;
        const light = (row + col) % 2 === 0;
        g.fillStyle(light ? 0x6e4833 : 0x5c3d28);
        g.fillRect(tX, tY, tileSize - 1, tileSize - 1);
      }
    }
    // Floor grid lines
    g.lineStyle(1, 0x3d2518, 0.8);
    for (let row = 0; row * tileSize <= H - floorY + tileSize; row++) {
      for (let col = 0; col * tileSize <= W; col++) {
        g.strokeRect(col * tileSize, floorY + row * tileSize, tileSize, tileSize);
      }
    }
    // Perspective shadow on floor near wall
    const shadow = this.scene.add.graphics().setDepth(1);
    for (let i = 0; i < 40; i++) {
      shadow.fillStyle(0x000000, (40 - i) / 40 * 0.35);
      shadow.fillRect(0, floorY + i, W, 1);
    }
  }

  private drawCarpet(W: number, H: number, floorY: number): void {
    const cW = Math.floor(W * 0.34);
    const cX = (W - cW) / 2;
    const g = this.scene.add.graphics().setDepth(1);
    // Shadow under carpet
    g.fillStyle(0x000000, 0.2);
    g.fillRect(cX + 6, floorY + 6, cW, H - floorY);
    // Carpet body
    g.fillStyle(0x6b1a2a);
    g.fillRect(cX, floorY, cW, H - floorY);
    // Border
    g.lineStyle(4, 0xaa3344, 1);
    g.strokeRect(cX, floorY, cW, H - floorY);
    g.lineStyle(2, 0xdd8866, 0.7);
    g.strokeRect(cX + 8, floorY + 8, cW - 16, H - floorY - 8);
    // Carpet pattern (diamond shapes)
    g.lineStyle(1, 0x8b2233, 0.5);
    const dSize = 40;
    for (let row = 0; row * dSize <= H - floorY; row++) {
      for (let col = 0; col * dSize <= cW; col++) {
        const cx = cX + col * dSize + dSize / 2;
        const cy = floorY + row * dSize + dSize / 2;
        g.strokeRect(cx - dSize / 3, cy - dSize / 3, dSize * 0.66, dSize * 0.66);
      }
    }
  }

  private drawWindow(wx: number, wy: number, floorY: number, wallTopY: number): void {
    const wW = Math.min(130, (floorY - wallTopY) * 0.6);
    const wH = Math.min(160, (floorY - wallTopY) * 0.75);
    const g = this.scene.add.graphics().setDepth(2);
    // Stone frame (3D effect)
    g.fillStyle(0x1e110a);
    g.fillRect(wx - wW / 2 - 12, wy - wH / 2 - 12, wW + 24, wH + 24);
    g.fillStyle(0x4a3020);
    g.fillRect(wx - wW / 2 - 6, wy - wH / 2 - 6, wW + 12, wH + 12);
    // Night sky
    g.fillStyle(0x05051f);
    g.fillRect(wx - wW / 2, wy - wH / 2, wW, wH);
    // Stars (fixed positions)
    const starData = [
      [0.1,0.1,2],[0.3,0.07,3],[0.6,0.15,2],[0.8,0.08,2],
      [0.15,0.4,2],[0.5,0.35,3],[0.75,0.45,2],[0.25,0.65,2],
      [0.55,0.7,2],[0.85,0.6,2],[0.4,0.85,2],[0.7,0.8,3],
      [0.9,0.3,2],[0.05,0.75,2],[0.45,0.5,3],
    ];
    g.fillStyle(0xeeeeff);
    for (const [sx, sy, sz] of starData) {
      g.fillRect(wx - wW / 2 + sx * wW, wy - wH / 2 + sy * wH, sz, sz);
    }
    // Bright stars
    g.fillStyle(0xffffff);
    g.fillRect(wx - wW / 2 + wW * 0.3, wy - wH / 2 + wH * 0.07, 4, 4);
    g.fillRect(wx - wW / 2 + wW * 0.7, wy - wH / 2 + wH * 0.4, 3, 3);
    // Moon
    g.fillStyle(0xeeeebb);
    g.fillCircle(wx + wW * 0.22, wy - wH * 0.27, 14);
    g.fillStyle(0x08081a);
    g.fillCircle(wx + wW * 0.28, wy - wH * 0.27, 10);
    // OASIS constellation
    g.fillStyle(0x6688ff, 0.9);
    const oasisStars = [
      [wx - 12, wy + 10], [wx, wy - 5], [wx + 14, wy + 12],
      [wx - 6, wy + 25], [wx + 8, wy + 22],
    ];
    for (const [sx, sy] of oasisStars) {
      g.fillRect(sx - 2, sy - 2, 4, 4);
    }
    g.lineStyle(1, 0x4466cc, 0.5);
    for (let i = 0; i < oasisStars.length - 1; i++) {
      g.lineBetween(oasisStars[i][0], oasisStars[i][1], oasisStars[i+1][0], oasisStars[i+1][1]);
    }
    // Window cross bars
    g.lineStyle(8, 0x2a1a0f, 1);
    g.lineBetween(wx, wy - wH / 2, wx, wy + wH / 2);
    g.lineBetween(wx - wW / 2, wy, wx + wW / 2, wy);
    g.lineStyle(4, 0x3d2518, 1);
    g.lineBetween(wx, wy - wH / 2, wx, wy + wH / 2);
    g.lineBetween(wx - wW / 2, wy, wx + wW / 2, wy);
    // Glow on floor from moonlight
    g.fillStyle(0x4466aa, 0.04);
    g.fillEllipse(wx, floorY + 30, wW * 0.8, 40);
  }

  private drawTorchBrackets(): void {
    for (const t of [
      { x: this.layout.torch1X, y: this.layout.torchY },
      { x: this.layout.torch2X, y: this.layout.torchY },
      { x: this.layout.W * 0.1, y: this.layout.torchY },
      { x: this.layout.W * 0.9, y: this.layout.torchY },
    ]) {
      const g = this.scene.add.graphics().setDepth(3);
      // Wall bracket
      g.fillStyle(0x444433);
      g.fillRect(t.x - 6, t.y - 2, 12, 5);
      g.fillRect(t.x - 3, t.y - 16, 6, 16);
      // Torch stick
      g.fillStyle(0x7a4e1a);
      g.fillRect(t.x - 3, t.y - 30, 5, 16);
      // Torch cup
      g.fillStyle(0x8b6914);
      g.fillRect(t.x - 6, t.y - 34, 12, 7);
      g.fillStyle(0x6b4a10);
      g.fillRect(t.x - 5, t.y - 35, 10, 3);
    }
  }

  private drawStrategyTable(): void {
    const { tableX, tableY } = this.layout;
    const g = this.scene.add.graphics().setDepth(2);
    const tW = 220, tH = 90;
    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillRect(tableX - tW / 2 + 8, tableY - tH / 2 + 8, tW, tH + 40);
    // Legs
    g.fillStyle(0x3d2510);
    g.fillRect(tableX - tW / 2 + 12, tableY + tH / 2 - 10, 14, 40);
    g.fillRect(tableX + tW / 2 - 26, tableY + tH / 2 - 10, 14, 40);
    g.fillRect(tableX - tW / 2 + 12, tableY + tH / 2 - 12, 14, 40);
    g.fillRect(tableX + tW / 2 - 26, tableY + tH / 2 - 12, 14, 40);
    // Table surface
    g.fillStyle(0x6b3d18);
    g.fillRect(tableX - tW / 2, tableY - tH / 2, tW, tH);
    g.lineStyle(3, 0x3d2010, 1);
    g.strokeRect(tableX - tW / 2, tableY - tH / 2, tW, tH);
    // Table edge highlight
    g.lineStyle(1, 0x8b5a28, 0.7);
    g.lineBetween(tableX - tW / 2 + 2, tableY - tH / 2 + 2, tableX + tW / 2 - 2, tableY - tH / 2 + 2);
    g.lineBetween(tableX - tW / 2 + 2, tableY - tH / 2 + 2, tableX - tW / 2 + 2, tableY + tH / 2 - 2);
    // Parchment map
    g.fillStyle(0xd4b06a);
    g.fillRect(tableX - 78, tableY - tH / 2 + 10, 156, 62);
    // Map edge shadow
    g.lineStyle(2, 0x8b7040, 1);
    g.strokeRect(tableX - 78, tableY - tH / 2 + 10, 156, 62);
    // Map grid
    g.lineStyle(1, 0xaa8848, 0.6);
    for (let i = 1; i < 5; i++) {
      g.lineBetween(tableX - 78 + i * 31, tableY - tH / 2 + 10, tableX - 78 + i * 31, tableY - tH / 2 + 72);
    }
    for (let i = 1; i < 3; i++) {
      g.lineBetween(tableX - 78, tableY - tH / 2 + 10 + i * 20, tableX + 78, tableY - tH / 2 + 10 + i * 20);
    }
    // Map markers
    g.fillStyle(0xff2244);
    g.fillCircle(tableX - 22, tableY - tH / 2 + 30, 5);
    g.fillCircle(tableX + 28, tableY - tH / 2 + 50, 5);
    g.fillStyle(0x2244ff);
    g.fillCircle(tableX + 8, tableY - tH / 2 + 22, 4);
    g.fillStyle(0x00aa44);
    g.fillCircle(tableX - 48, tableY - tH / 2 + 55, 4);
    // Marker rings
    g.lineStyle(1, 0xaa0022);
    g.strokeCircle(tableX - 22, tableY - tH / 2 + 30, 9);
    // Label
    this.scene.add.text(tableX, tableY + tH / 2 + 10, '⚔ Mesa de Estrategia', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#8b6040',
    }).setOrigin(0.5, 0).setDepth(3);
  }

  private drawBaseboards(W: number, floorY: number): void {
    const g = this.scene.add.graphics().setDepth(2);
    // Baseboard strip
    g.fillStyle(0x1e120a);
    g.fillRect(0, floorY - 10, W, 14);
    g.lineStyle(2, 0x5a3520, 1);
    g.lineBetween(0, floorY + 2, W, floorY + 2);
    g.lineStyle(1, 0x8b5530, 0.5);
    g.lineBetween(0, floorY - 8, W, floorY - 8);
  }

  updateTorches(delta: number): void {
    const g = this.torchGfx;
    g.clear();
    for (const torch of this.torches) {
      torch.timer += delta * 0.006;
      const flicker = 0.75 + 0.25 * (Math.sin(torch.timer * 7.3) + 0.5 * Math.sin(torch.timer * 13.1 + 0.5));
      const baseH = 20;
      const h = baseH + 8 * flicker;
      const wave = Math.sin(torch.timer * 4.7) * 3;
      // Ambient glow on wall
      g.fillStyle(0xff8800, 0.06 * flicker);
      g.fillCircle(torch.x, torch.y - baseH, 60);
      g.fillStyle(0xffcc44, 0.04 * flicker);
      g.fillCircle(torch.x, torch.y - baseH, 35);
      // Flame outer (orange)
      g.fillStyle(0xff5500);
      g.fillTriangle(
        torch.x - 9, torch.y - 28,
        torch.x + 9, torch.y - 28,
        torch.x + wave, torch.y - 28 - h,
      );
      // Flame mid (yellow)
      g.fillStyle(0xffcc00);
      g.fillTriangle(
        torch.x - 5, torch.y - 28,
        torch.x + 5, torch.y - 28,
        torch.x + wave * 0.6, torch.y - 28 - h * 0.75,
      );
      // Flame core (white)
      g.fillStyle(0xffffff, 0.8 * flicker);
      g.fillCircle(torch.x + wave * 0.3, torch.y - 30, 4 * flicker);
      // Embers (small random sparks above flame)
      if (Math.random() < 0.3) {
        const ex = torch.x + Phaser.Math.Between(-8, 8);
        const ey = torch.y - 28 - h - Phaser.Math.Between(2, 12);
        g.fillStyle(0xff8800, 0.8);
        g.fillRect(ex, ey, 2, 2);
      }
      // Floor glow
      g.fillStyle(0xff8800, 0.025 * flicker);
      g.fillEllipse(torch.x, this.layout.floorY, 90, 22);
    }
  }
}
