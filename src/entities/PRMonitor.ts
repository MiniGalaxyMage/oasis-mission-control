import Phaser from 'phaser';
import { PRData } from '../types';

/**
 * Monitor de PRs — pergaminos colgados en la pared, estilo RPG.
 */
export class PRMonitor {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private w: number;
  private h: number;
  private container!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number) {
    this.scene = scene;
    this.x = cx;
    this.y = cy;
    this.w = w;
    this.h = h;
    this.drawFrame();
    this.container = scene.add.container(0, 0).setDepth(5);
  }

  private drawFrame(): void {
    const { x, y, w, h, scene } = this;
    const g = scene.add.graphics().setDepth(4);

    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillRect(x - w / 2 + 5, y - h / 2 + 5, w, h);

    // Background — dark stone arch area
    g.fillStyle(0x2a1a0a);
    g.fillRect(x - w / 2, y - h / 2, w, h);

    // Inner wall section
    g.fillStyle(0x3a2510);
    g.fillRect(x - w / 2 + 8, y - h / 2 + 28, w - 16, h - 36);

    // Frame border
    g.fillStyle(0x4a2a12);
    g.fillRect(x - w / 2, y - h / 2, w, 24);
    g.fillRect(x - w / 2, y + h / 2 - 8, w, 8);
    g.fillRect(x - w / 2, y - h / 2, 8, h);
    g.fillRect(x + w / 2 - 8, y - h / 2, 8, h);

    // Frame outline
    g.lineStyle(2, 0x1a0f05, 1);
    g.strokeRect(x - w / 2, y - h / 2, w, h);

    // Corner decorations
    g.fillStyle(0xaa8822);
    g.fillCircle(x - w / 2 + 4, y - h / 2 + 4, 5);
    g.fillCircle(x + w / 2 - 4, y - h / 2 + 4, 5);
    g.fillCircle(x - w / 2 + 4, y + h / 2 - 4, 5);
    g.fillCircle(x + w / 2 - 4, y + h / 2 - 4, 5);

    // Header plaque
    g.fillStyle(0x3d2208);
    g.fillRect(x - w / 2 + 6, y - h / 2, w - 12, 24);
    g.lineStyle(1, 0x6b3a18, 0.8);
    g.strokeRect(x - w / 2 + 6, y - h / 2, w - 12, 24);

    // Header text
    scene.add.text(x, y - h / 2 + 12, '📜  PERGAMINOS DE PR  📜', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#cc9922',
      stroke: '#1a0f05',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(5);

    // Hanging rope
    g.lineStyle(2, 0x8b6010, 0.7);
    g.lineBetween(x - w * 0.3, y - h / 2, x - w * 0.3, y - h / 2 + 28);
    g.lineBetween(x, y - h / 2, x, y - h / 2 + 28);
    g.lineBetween(x + w * 0.3, y - h / 2, x + w * 0.3, y - h / 2 + 28);
  }

  updatePRs(prs: PRData[]): void {
    this.container.removeAll(true);
    const { x, y, w, h, scene } = this;

    if (prs.length === 0) {
      scene.add.text(x, y, 'Sin PRs abiertas', {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#6b4a18',
      }).setOrigin(0.5, 0.5).setDepth(6);
      return;
    }

    const maxScrolls = Math.min(prs.length, 5);
    const scrollW = Math.min(130, (w - 40) / maxScrolls - 6);
    const scrollH = h - 44;
    const totalW = maxScrolls * (scrollW + 6) - 6;
    const startX = x - totalW / 2;

    for (let i = 0; i < maxScrolls; i++) {
      const pr = prs[i];
      const sx = startX + i * (scrollW + 6) + scrollW / 2;
      const sy = y - h / 2 + 32 + scrollH / 2;
      this.drawScroll(sx, sy, scrollW, scrollH, pr);
    }
  }

  private prColor(pr: PRData): number {
    if (pr.status === 'merged') return 0x8855ff;
    if (pr.status === 'open') {
      if (pr.ci === 'failing') return 0xff3322;
      return 0x22cc55;
    }
    if (pr.status === 'closed') return 0x888888;
    if (pr.status === 'draft') return 0x888888;
    return 0xaaaaaa;
  }

  private drawScroll(sx: number, sy: number, sW: number, sH: number, pr: PRData): void {
    const { scene } = this;
    const color = this.prColor(pr);
    const g = scene.add.graphics().setDepth(5);
    this.container.add(g);

    // Scroll rope
    g.lineStyle(2, 0x8b6010, 0.7);
    g.lineBetween(sx, sy - sH / 2 - 16, sx, sy - sH / 2);

    // Rope knot
    g.fillStyle(0x6b4810);
    g.fillCircle(sx, sy - sH / 2 - 2, 4);

    // Scroll shadow
    g.fillStyle(0x000000, 0.25);
    g.fillRect(sx - sW / 2 + 3, sy - sH / 2 + 3, sW, sH);

    // Scroll background — parchment
    g.fillStyle(0xdec080);
    g.fillRect(sx - sW / 2, sy - sH / 2, sW, sH);

    // Parchment texture lines
    g.lineStyle(1, 0xc4a860, 0.4);
    for (let i = 1; i < 10; i++) {
      g.lineBetween(sx - sW / 2, sy - sH / 2 + i * (sH / 10), sx + sW / 2, sy - sH / 2 + i * (sH / 10));
    }

    // Scroll top/bottom rollers
    g.fillStyle(0x8b6914);
    g.fillRect(sx - sW / 2 - 4, sy - sH / 2, sW + 8, 10);
    g.fillRect(sx - sW / 2 - 4, sy + sH / 2 - 10, sW + 8, 10);
    // Roller knobs
    g.fillStyle(0xaa8822);
    g.fillCircle(sx - sW / 2 - 4, sy - sH / 2 + 5, 5);
    g.fillCircle(sx + sW / 2 + 4, sy - sH / 2 + 5, 5);
    g.fillCircle(sx - sW / 2 - 4, sy + sH / 2 - 5, 5);
    g.fillCircle(sx + sW / 2 + 4, sy + sH / 2 - 5, 5);
    // Roller line
    g.lineStyle(1, 0x7a5810, 0.8);
    g.strokeRect(sx - sW / 2 - 4, sy - sH / 2, sW + 8, 10);
    g.strokeRect(sx - sW / 2 - 4, sy + sH / 2 - 10, sW + 8, 10);

    // Status seal (colored circle top-right)
    g.fillStyle(color);
    g.fillCircle(sx + sW / 2 - 8, sy - sH / 2 + 16, 7);
    g.lineStyle(1, 0x000000, 0.5);
    g.strokeCircle(sx + sW / 2 - 8, sy - sH / 2 + 16, 7);
    // Seal icon
    const sealChar = pr.status === 'merged' ? '✓' : pr.status === 'open' ? '◆' : '✗';
    scene.add.text(sx + sW / 2 - 8, sy - sH / 2 + 16, sealChar, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(7);

    // PR number
    scene.add.text(sx - sW / 2 + 5, sy - sH / 2 + 12, `#${pr.number}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#5a3a10',
    }).setDepth(7);

    // Repo
    scene.add.text(sx, sy - sH / 2 + 22, pr.repo, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#7a5a20',
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(7);

    // Title (wrapped)
    const maxChars = Math.floor(sW / 5);
    const lines = this.wrapText(pr.title, maxChars).slice(0, 4);
    lines.forEach((line, li) => {
      scene.add.text(sx - sW / 2 + 5, sy - sH / 2 + 32 + li * 11, line, {
        fontFamily: '"Press Start 2P"',
        fontSize: '4px',
        color: '#2a1808',
      }).setDepth(7);
    });

    // Status badge at bottom
    const statusLabel = pr.status === 'merged' ? 'MERGED'
      : pr.status === 'open' ? 'OPEN'
      : pr.status.toUpperCase();
    scene.add.text(sx, sy + sH / 2 - 16, statusLabel, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      stroke: '#2a1808',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(7);

    // Click to open GitHub
    const zone = scene.add.zone(sx, sy, sW, sH).setInteractive({ useHandCursor: true }).setDepth(8);
    zone.on('pointerover', () => scene.input.setDefaultCursor('pointer'));
    zone.on('pointerout', () => scene.input.setDefaultCursor('default'));
    zone.on('pointerdown', () => {
      if (pr.url) window.open(pr.url, '_blank');
    });
    this.container.add(zone);
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        if (current) lines.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  }

  setDepth(_d: number): this { return this; }
}
