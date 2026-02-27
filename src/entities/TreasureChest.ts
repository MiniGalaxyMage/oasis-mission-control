import Phaser from 'phaser';

/**
 * Cofre del tesoro — se abre cuando hay PRs mergeadas.
 */
export class TreasureChest {
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  private gfx!: Phaser.GameObjects.Graphics;
  private glowGfx!: Phaser.GameObjects.Graphics;
  private particles: Array<{
    x: number; y: number;
    vx: number; vy: number;
    life: number; color: number; size: number;
  }> = [];
  private isOpen = false;
  private openAnim = 0;   // 0..1 open progress
  private glowTimer = 0;
  private hasMergedPRs = false;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private container!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.glowGfx = scene.add.graphics().setDepth(3);
    this.gfx = scene.add.graphics().setDepth(4);
    // Invisible clickable zone
    this.container = scene.add.container(x, y);
    this.container.setSize(70, 60);
    this.container.setInteractive(new Phaser.Geom.Rectangle(-35, -30, 70, 60), Phaser.Geom.Rectangle.Contains);
    this.container.on('pointerover', () => { scene.input.setDefaultCursor('pointer'); });
    this.container.on('pointerout', () => { scene.input.setDefaultCursor('default'); this.hideTooltip(); });
    this.container.on('pointerdown', () => this.onClick());
    this.container.setDepth(10);
    this.drawChest();
  }

  setHasMergedPRs(has: boolean): void {
    this.hasMergedPRs = has;
  }

  private onClick(): void {
    if (this.hasMergedPRs && !this.isOpen) {
      this.open();
    } else {
      this.showTooltip();
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    // Coin/gem explosion
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(2, 6);
      this.particles.push({
        x: this.x,
        y: this.y - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        color: [0xffdd00, 0xffaa00, 0xff8800, 0xffffff, 0x88ffcc][i % 5],
        size: Phaser.Math.Between(3, 7),
      });
    }
  }

  private showTooltip(): void {
    if (this.tooltip) return;
    const text = this.hasMergedPRs
      ? '¡Hay PRs mergeadas!\nClick para abrir el cofre'
      : 'Cofre del Tesoro\n(Se abre con PRs mergeadas)';
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.95);
    bg.lineStyle(2, 0xffdd00);
    bg.fillRoundedRect(0, 0, 200, 40, 4);
    bg.strokeRoundedRect(0, 0, 200, 40, 4);
    const txt = this.scene.add.text(8, 8, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffdd00',
      wordWrap: { width: 184 },
    });
    this.tooltip = this.scene.add.container(this.x - 100, this.y - 80, [bg, txt]);
    this.tooltip.setDepth(200);
    this.scene.time.delayedCall(2500, () => this.hideTooltip());
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
  }

  update(delta: number): void {
    this.glowTimer += delta * 0.003;
    if (this.isOpen && this.openAnim < 1) {
      this.openAnim = Math.min(1, this.openAnim + delta * 0.003);
    }
    // Update particles
    const dt = delta / 16;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= dt * 0.035;
    }
    this.drawChest();
    this.drawParticles();
  }

  private drawChest(): void {
    const { x, y } = this;
    const g = this.gfx;
    const gg = this.glowGfx;
    g.clear();
    gg.clear();

    const lidAngle = this.openAnim * 80; // degrees

    // Glow when has merged PRs
    if (this.hasMergedPRs && !this.isOpen) {
      const pulse = 0.5 + 0.5 * Math.sin(this.glowTimer * 3);
      gg.fillStyle(0xffdd00, 0.08 * pulse);
      gg.fillCircle(x, y, 55);
      gg.fillStyle(0xffaa00, 0.12 * pulse);
      gg.fillCircle(x, y, 35);
    }
    if (this.isOpen) {
      gg.fillStyle(0xffdd00, 0.15);
      gg.fillCircle(x, y - 10, 60);
      gg.fillStyle(0xffffff, 0.1);
      gg.fillCircle(x, y - 10, 30);
    }

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, y + 18, 70, 16);

    // Chest body
    g.fillStyle(0x5a3010);
    g.fillRect(x - 30, y - 15, 60, 35);
    // Body iron bands
    g.fillStyle(0x888866);
    g.fillRect(x - 30, y - 5, 60, 6);
    g.fillRect(x - 30, y + 8, 60, 4);
    g.lineStyle(1, 0x555544, 1);
    g.strokeRect(x - 30, y - 5, 60, 6);
    g.strokeRect(x - 30, y + 8, 60, 4);
    // Body corners
    g.fillStyle(0x777755);
    g.fillRect(x - 32, y - 16, 7, 52);
    g.fillRect(x + 25, y - 16, 7, 52);
    g.lineStyle(1, 0x555533, 1);
    g.strokeRect(x - 32, y - 16, 7, 52);
    g.strokeRect(x + 25, y - 16, 7, 52);
    // Body outline
    g.lineStyle(2, 0x2a1a08, 1);
    g.strokeRect(x - 30, y - 15, 60, 35);

    // Lid (rotates open)
    // Draw lid using a polygon/trapezoid effect
    const lidH = 16;
    const lidOpenY = y - 15 - lidH * Math.sin(lidAngle * Math.PI / 180);
    const lidOpenDepth = lidH * Math.cos(lidAngle * Math.PI / 180);
    g.fillStyle(0x6b3a12);
    if (lidOpenDepth > 0) {
      g.fillRect(x - 30, lidOpenY, 60, lidOpenDepth);
    }
    // Lid metal band
    g.fillStyle(0x888866);
    g.fillRect(x - 30, lidOpenY, 60, 4);
    // Lid corners
    g.fillStyle(0x777755);
    g.fillRect(x - 32, lidOpenY, 7, lidOpenDepth + 2);
    g.fillRect(x + 25, lidOpenY, 7, lidOpenDepth + 2);
    // Lid outline
    g.lineStyle(2, 0x2a1a08, 1);
    if (lidOpenDepth > 0) {
      g.strokeRect(x - 30, lidOpenY, 60, lidOpenDepth);
    }

    // Lock / keyhole
    if (!this.isOpen) {
      g.fillStyle(0xcc9900);
      g.fillRect(x - 8, y - 4, 16, 14);
      g.lineStyle(1, 0x886600, 1);
      g.strokeRect(x - 8, y - 4, 16, 14);
      g.fillStyle(0x111100);
      g.fillCircle(x, y + 3, 4);
      g.fillRect(x - 2, y + 3, 4, 6);
    }

    // Inner glow when open
    if (this.isOpen && this.openAnim > 0.3) {
      g.fillStyle(0xffdd00, 0.3 * this.openAnim);
      g.fillRect(x - 26, y - 12, 52, 30);
      // Coins visible
      g.fillStyle(0xffcc00);
      g.fillCircle(x - 12, y + 8, 6);
      g.fillCircle(x + 5, y + 10, 5);
      g.fillCircle(x - 4, y + 4, 4);
      g.fillStyle(0xffee88);
      g.fillCircle(x - 12, y + 8, 3);
      g.fillCircle(x + 5, y + 10, 2.5);
    }

    // Label
    g.fillStyle(0x000000, 0);
    this.scene.add.text(x, y + 26, '⚜ Tesoro', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#8b6914',
    }).setOrigin(0.5, 0).setDepth(5);
  }

  private drawParticles(): void {
    const g = this.gfx;
    for (const p of this.particles) {
      g.fillStyle(p.color, p.life);
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
}
