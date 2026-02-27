import Phaser from 'phaser';

/**
 * Forge (herrería): yunque, fragua y fuego.
 * Dibujado programáticamente con Phaser Graphics.
 */
export class ForgeSmith {
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  private staticGfx!: Phaser.GameObjects.Graphics;
  private fireGfx!: Phaser.GameObjects.Graphics;
  private sparkGfx!: Phaser.GameObjects.Graphics;
  private particles: Array<{
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    color: number;
  }> = [];
  private fireTimer = 0;
  private isActive = false;
  private hammerTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.drawStatic();
    this.fireGfx = scene.add.graphics().setDepth(3);
    this.sparkGfx = scene.add.graphics().setDepth(5);
  }

  private drawStatic(): void {
    const { x, y } = this;
    this.staticGfx = this.scene.add.graphics().setDepth(2);
    const g = this.staticGfx;

    // === FRAGUA (Forge/Furnace) — left side ===
    // Base block
    g.fillStyle(0x2a2a2a);
    g.fillRect(x - 90, y - 60, 70, 70);
    g.lineStyle(2, 0x111111, 1);
    g.strokeRect(x - 90, y - 60, 70, 70);
    // Brick texture
    g.lineStyle(1, 0x1a1a1a, 0.8);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const bx = (x - 90) + col * 24 + (row % 2 === 0 ? 0 : 12);
        const by = (y - 60) + row * 17;
        g.strokeRect(bx, by, 24, 17);
      }
    }
    // Furnace opening
    g.fillStyle(0x0a0000);
    g.fillRect(x - 82, y - 16, 50, 28);
    g.lineStyle(2, 0x333333, 1);
    g.strokeRect(x - 82, y - 16, 50, 28);
    // Grate bars
    g.lineStyle(3, 0x333333, 1);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(x - 82 + 8 + i * 11, y - 16, x - 82 + 8 + i * 11, y + 12);
    }
    // Furnace chimney
    g.fillStyle(0x222222);
    g.fillRect(x - 80, y - 75, 30, 20);
    g.fillRect(x - 74, y - 88, 18, 18);
    g.lineStyle(1, 0x111111, 1);
    g.strokeRect(x - 80, y - 75, 30, 20);
    g.strokeRect(x - 74, y - 88, 18, 18);

    // === YUNQUE (Anvil) — sprite real de Gemini ===
    const ax = x + 10;
    const ay = y - 8;
    // Sombra
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(ax, ay + 28, 70, 16);

    // Sprite real
    const anvilImg = this.scene.add.image(ax, ay, 'anvil');
    anvilImg.setDisplaySize(80, 70);
    anvilImg.setOrigin(0.5, 1);
    anvilImg.setDepth(3);

    // Label
    this.scene.add.text(x - 20, y + 16, '⚒ Herrería', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#665544',
    }).setOrigin(0.5, 0).setDepth(3);
  }

  setActive(active: boolean): void {
    this.isActive = active;
  }

  spawnSparks(): void {
    const ax = this.x + 10;
    const ay = this.y - 20;
    for (let i = 0; i < Phaser.Math.Between(3, 7); i++) {
      this.particles.push({
        x: ax + Phaser.Math.Between(-15, 15),
        y: ay,
        vx: Phaser.Math.FloatBetween(-2.5, 2.5),
        vy: Phaser.Math.FloatBetween(-4, -1.5),
        life: 1,
        maxLife: 1,
        color: [0xffcc00, 0xff8800, 0xffee44, 0xffffff][Phaser.Math.Between(0, 3)],
      });
    }
  }

  update(delta: number): void {
    this.fireTimer += delta * 0.006;
    this.hammerTimer += delta;

    // Auto-sparks when active
    if (this.isActive && this.hammerTimer > 400) {
      this.hammerTimer = 0;
      this.spawnSparks();
    }

    // Update particles
    const dt = delta / 16;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.15 * dt; // gravity
      p.life -= dt * 0.06;
    }

    this.drawFire();
    this.drawParticles();
  }

  private drawFire(): void {
    const g = this.fireGfx;
    g.clear();
    const { x, y } = this;

    // Fire inside furnace opening
    const fx = x - 57; // center of furnace opening
    const fy = y; // at opening level
    const t = this.fireTimer;
    const intensity = this.isActive ? 1.2 : 0.6;

    // Outer glow from furnace
    g.fillStyle(0xff4400, 0.15 * intensity);
    g.fillEllipse(fx, fy - 5, 80, 50);
    g.fillStyle(0xff8800, 0.1 * intensity);
    g.fillEllipse(fx, fy - 5, 50, 30);

    // Fire flames (inside opening)
    const flames = [
      { ox: -14, amp: 6, freq: 3.1 },
      { ox: 0, amp: 8, freq: 4.7 },
      { ox: 12, amp: 5, freq: 5.3 },
    ];
    for (const f of flames) {
      const wave = Math.sin(t * f.freq + f.ox) * f.amp;
      const fh = (12 + 6 * Math.abs(Math.sin(t * f.freq * 0.7))) * intensity;
      // Outer flame
      g.fillStyle(0xff4400);
      g.fillTriangle(
        fx + f.ox - 7, fy - 8,
        fx + f.ox + 7, fy - 8,
        fx + f.ox + wave, fy - 8 - fh,
      );
      // Inner flame
      g.fillStyle(0xffcc00);
      g.fillTriangle(
        fx + f.ox - 4, fy - 8,
        fx + f.ox + 4, fy - 8,
        fx + f.ox + wave * 0.5, fy - 8 - fh * 0.7,
      );
    }
    // White hot core
    g.fillStyle(0xffffff, 0.6 * intensity);
    g.fillCircle(fx, fy - 10, 5 * intensity);

    // Chimney smoke
    if (this.isActive) {
      const smokeY = y - 88;
      for (let i = 0; i < 3; i++) {
        const sOff = Math.sin(t * 1.5 + i * 1.2) * 8;
        g.fillStyle(0x888888, (0.15 - i * 0.04) * intensity);
        g.fillCircle(x - 65 + sOff, smokeY - i * 18, 12 + i * 4);
      }
    }
  }

  private drawParticles(): void {
    const g = this.sparkGfx;
    g.clear();
    for (const p of this.particles) {
      const alpha = p.life;
      g.fillStyle(p.color, alpha);
      const size = Math.max(1, 3 * p.life);
      g.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      // Spark trail
      g.fillStyle(p.color, alpha * 0.4);
      g.fillRect(p.x - p.vx - size / 4, p.y - p.vy * 0.5 - size / 4, size * 0.6, size * 0.6);
    }
  }
}
