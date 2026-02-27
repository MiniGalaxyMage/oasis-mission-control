import Phaser from 'phaser';

/**
 * Cofre del tesoro — usa sprite real de Gemini (2 frames: cerrado/abierto).
 * Se abre cuando hay PRs mergeadas.
 */
export class TreasureChest {
  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  private chestSprite!: Phaser.GameObjects.Sprite;
  private glowGfx!: Phaser.GameObjects.Graphics;
  private particleGfx!: Phaser.GameObjects.Graphics;
  private particles: Array<{
    x: number; y: number;
    vx: number; vy: number;
    life: number; color: number; size: number;
  }> = [];
  private isOpen = false;
  private glowTimer = 0;
  private hasMergedPRs = false;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private container!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.glowGfx = scene.add.graphics().setDepth(3);
    this.particleGfx = scene.add.graphics().setDepth(5);

    // Sombra
    const shadow = scene.add.graphics().setDepth(3);
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillEllipse(x, y + 20, 80, 18);

    // Sprite real del cofre (frame 0 = cerrado, frame 1 = abierto)
    this.chestSprite = scene.add.sprite(x, y, 'treasure-chest', 0);
    this.chestSprite.setDisplaySize(70, 60);
    this.chestSprite.setOrigin(0.5, 0.5);
    this.chestSprite.setDepth(4);

    // Label
    scene.add.text(x, y + 36, '⚜ Tesoro', {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#8b6914',
    }).setOrigin(0.5, 0).setDepth(5);

    // Clickable zone
    this.container = scene.add.container(x, y);
    this.container.setSize(70, 60);
    this.container.setInteractive(new Phaser.Geom.Rectangle(-35, -30, 70, 60), Phaser.Geom.Rectangle.Contains);
    this.container.on('pointerover', () => { scene.input.setDefaultCursor('pointer'); });
    this.container.on('pointerout', () => { scene.input.setDefaultCursor('default'); this.hideTooltip(); });
    this.container.on('pointerdown', () => this.onClick());
    this.container.setDepth(10);
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
    // Cambiar al frame abierto
    this.chestSprite.setFrame(1);
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

    // Glow pulsante cuando hay PRs mergeadas y está cerrado
    const gg = this.glowGfx;
    gg.clear();
    if (this.hasMergedPRs && !this.isOpen) {
      const pulse = 0.5 + 0.5 * Math.sin(this.glowTimer * 3);
      gg.fillStyle(0xffdd00, 0.08 * pulse);
      gg.fillCircle(this.x, this.y, 55);
      gg.fillStyle(0xffaa00, 0.12 * pulse);
      gg.fillCircle(this.x, this.y, 35);
    }
    if (this.isOpen) {
      gg.fillStyle(0xffdd00, 0.15);
      gg.fillCircle(this.x, this.y - 10, 60);
      gg.fillStyle(0xffffff, 0.10);
      gg.fillCircle(this.x, this.y - 10, 30);
    }

    // Partículas
    const dt = delta / 16;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= dt * 0.035;
    }
    this.drawParticles();
  }

  private drawParticles(): void {
    const g = this.particleGfx;
    g.clear();
    for (const p of this.particles) {
      g.fillStyle(p.color, p.life);
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
}
