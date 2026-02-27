import Phaser from 'phaser';
import { TaskData } from '../types';

const STATUS_COLORS: Record<string, number> = {
  'in-progress': 0x4488ff,
  'done': 0x00ff88,
  'blocked': 0xff4422,
};

/**
 * Tablón de misiones — dibujado en la pared como un quest board RPG.
 * Muestra las tareas activas del snapshot.
 */
export class TaskBoard {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private w: number;
  private h: number;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private contentContainer!: Phaser.GameObjects.Container;
  private tooltip: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number) {
    this.scene = scene;
    this.x = cx;
    this.y = cy;
    this.w = w;
    this.h = h;
    this.drawBoard();
    this.contentContainer = scene.add.container(cx, cy).setDepth(5);
  }

  private drawBoard(): void {
    const { x, y, w, h, scene } = this;
    const g = scene.add.graphics().setDepth(4);
    this.bgGfx = g;

    // Shadow
    g.fillStyle(0x000000, 0.4);
    g.fillRect(x - w / 2 + 6, y - h / 2 + 6, w, h);

    // Wood backing — dark brown
    g.fillStyle(0x3a2010);
    g.fillRect(x - w / 2, y - h / 2, w, h);

    // Cork board area
    g.fillStyle(0x8b6914);
    g.fillRect(x - w / 2 + 12, y - h / 2 + 28, w - 24, h - 36);

    // Cork texture (subtle dots)
    g.fillStyle(0x7a5a0a, 0.5);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        const dx = (x - w / 2 + 12) + col * ((w - 24) / 12) + 5;
        const dy = (y - h / 2 + 28) + row * ((h - 36) / 8) + 4;
        g.fillCircle(dx, dy, 2);
      }
    }

    // Wood frame
    g.fillStyle(0x5a3010);
    g.fillRect(x - w / 2, y - h / 2, w, 14);         // top
    g.fillRect(x - w / 2, y + h / 2 - 10, w, 10);    // bottom
    g.fillRect(x - w / 2, y - h / 2, 12, h);          // left
    g.fillRect(x + w / 2 - 12, y - h / 2, 12, h);     // right

    // Frame outline
    g.lineStyle(2, 0x2a1808, 1);
    g.strokeRect(x - w / 2, y - h / 2, w, h);
    g.lineStyle(1, 0x7a4a18, 0.6);
    g.strokeRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4);

    // Corner nails
    const nailPositions = [
      [x - w / 2 + 6, y - h / 2 + 6],
      [x + w / 2 - 6, y - h / 2 + 6],
      [x - w / 2 + 6, y + h / 2 - 6],
      [x + w / 2 - 6, y + h / 2 - 6],
    ];
    for (const [nx, ny] of nailPositions) {
      g.fillStyle(0xaaaa88);
      g.fillCircle(nx, ny, 4);
      g.fillStyle(0xddddaa);
      g.fillCircle(nx - 1, ny - 1, 2);
    }

    // Header sign (wood plaque)
    g.fillStyle(0x4a2a0a);
    g.fillRect(x - w / 2 + 8, y - h / 2, w - 16, 24);
    g.lineStyle(1, 0x7a4a18, 0.8);
    g.strokeRect(x - w / 2 + 8, y - h / 2, w - 16, 24);

    // Header text
    scene.add.text(x, y - h / 2 + 12, '⚔  TABLÓN DE MISIONES  ⚔', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffcc44',
      stroke: '#2a1808',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(5);

    // Decorative tacks (random)
    g.fillStyle(0xff3322);
    g.fillCircle(x - w / 2 + 18, y - h / 2 + 35, 4);
    g.fillStyle(0xff6644);
    g.fillCircle(x - w / 2 + 17, y - h / 2 + 34, 2);
    g.fillStyle(0x3366ff);
    g.fillCircle(x + w / 2 - 18, y - h / 2 + 35, 4);
    g.fillStyle(0x6688ff);
    g.fillCircle(x + w / 2 - 19, y - h / 2 + 34, 2);
  }

  updateTasks(tasks: TaskData[]): void {
    if (this.contentContainer) {
      this.contentContainer.removeAll(true);
    }
    const { x, y, w, h, scene } = this;
    const cardW = Math.min(160, (w - 40) / Math.max(1, tasks.length) - 8);
    const cardH = h - 50;
    const totalW = tasks.length * (cardW + 8) - 8;
    const startX = x - totalW / 2;

    tasks.forEach((task, i) => {
      const cx = startX + i * (cardW + 8) + cardW / 2;
      const cy = y - h / 2 + 30 + cardH / 2;
      this.drawTaskCard(cx, cy, cardW, cardH, task);
    });

    if (tasks.length === 0) {
      const txt = scene.add.text(x, y + 4, 'Sin misiones activas', {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#8b6914',
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(6);
      this.contentContainer.add(txt);
    }
  }

  private drawTaskCard(cx: number, cy: number, cW: number, cH: number, task: TaskData): void {
    const { scene } = this;
    const color = STATUS_COLORS[task.status] ?? 0xaaaaaa;
    const g = scene.add.graphics().setDepth(5);
    this.contentContainer.add(g);

    // Pushpin shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRect(cx - cW / 2 + 3, cy - cH / 2 + 3, cW, cH);

    // Card background — parchment
    g.fillStyle(0xd4b870);
    g.fillRect(cx - cW / 2, cy - cH / 2, cW, cH);

    // Aged edge effect
    g.fillStyle(0xb89840, 0.4);
    g.fillRect(cx - cW / 2, cy - cH / 2, cW, 3);
    g.fillRect(cx - cW / 2, cy + cH / 2 - 3, cW, 3);

    // Status color strip (left side)
    g.fillStyle(color);
    g.fillRect(cx - cW / 2, cy - cH / 2, 5, cH);

    // Card outline
    g.lineStyle(1, 0x8a6810, 0.8);
    g.strokeRect(cx - cW / 2, cy - cH / 2, cW, cH);

    // Pushpin
    g.fillStyle(0xff3322);
    g.fillCircle(cx, cy - cH / 2, 5);
    g.fillStyle(0xff6655);
    g.fillCircle(cx - 1, cy - cH / 2 - 1, 3);
    g.fillStyle(0x888877);
    g.fillRect(cx - 1, cy - cH / 2 + 3, 2, 8);

    // Status badge
    const statusLabel = task.status === 'in-progress' ? 'EN CURSO'
      : task.status === 'done' ? 'HECHO'
      : 'BLOQUEADO';
    scene.add.text(cx - cW / 2 + 8, cy - cH / 2 + 6, statusLabel, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    }).setDepth(6);

    // Task title (wrapped)
    const titleLines = this.wrapText(task.title, Math.floor(cW / 5));
    titleLines.slice(0, 3).forEach((line, li) => {
      scene.add.text(cx - cW / 2 + 8, cy - cH / 2 + 18 + li * 11, line, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#2a1808',
      }).setDepth(6);
    });

    // Branch tag
    scene.add.text(cx - cW / 2 + 8, cy + cH / 2 - 18, task.branch, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#5a4010',
    }).setDepth(6);

    // Agent tag
    scene.add.text(cx + cW / 2 - 8, cy + cH / 2 - 10, task.agent, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#6a5010',
      align: 'right',
    }).setOrigin(1, 0).setDepth(6);

    // Make interactive
    const zone = scene.add.zone(cx, cy, cW, cH)
      .setInteractive({ useHandCursor: true })
      .setDepth(8);
    zone.on('pointerover', () => this.showTaskTooltip(cx, cy, task));
    zone.on('pointerout', () => this.hideTooltip());
    this.contentContainer.add(zone);
  }

  private showTaskTooltip(cx: number, cy: number, task: TaskData): void {
    if (this.tooltip) return;
    const lines = [`Repo: ${task.repo}`, `Agent: ${task.agent}`, `Status: ${task.status}`];
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.95);
    bg.lineStyle(2, 0x4488ff);
    bg.fillRoundedRect(0, 0, 180, lines.length * 14 + 12, 4);
    bg.strokeRoundedRect(0, 0, 180, lines.length * 14 + 12, 4);
    const texts = lines.map((l, i) =>
      this.scene.add.text(8, 6 + i * 14, l, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#4488ff',
      })
    );
    this.tooltip = this.scene.add.container(cx + 20, cy - 30, [bg, ...texts]).setDepth(300);
  }

  private hideTooltip(): void {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
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

  // Legacy API compatibility
  setDepth(_d: number): this { return this; }
}
