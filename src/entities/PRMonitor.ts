import Phaser from 'phaser';
import { PRData } from '../types';

const CI_ICON: Record<string, string> = {
  passing: '✅',
  passed: '✅',
  failing: '❌',
  running: '⏳',
};

const STATUS_COLOR: Record<string, string> = {
  open: '#4488ff',
  merged: '#cc44ff',
  closed: '#888888',
  draft: '#aaaaaa',
};

export class PRMonitor extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Graphics;
  private prs: PRData[] = [];
  private itemContainers: Phaser.GameObjects.Container[] = [];
  private panelWidth: number;
  private panelHeight: number;
  // Track previously merged for chest animation
  private mergedPRs = new Set<number>();

  constructor(scene: Phaser.Scene, x: number, y: number, panelWidth: number, panelHeight: number) {
    super(scene, x, y);
    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;
    this.build();
    scene.add.existing(this);
  }

  private build(): void {
    this.bg = this.scene.add.graphics();
    this.drawBg();
    this.add(this.bg);

    const title = this.scene.add.text(10, 8, '🔀 PULL REQUESTS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#cc44ff',
    });
    this.add(title);
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x0d0d1a, 0.95);
    this.bg.lineStyle(1, 0xcc44ff, 0.8);
    this.bg.fillRect(0, 0, this.panelWidth, this.panelHeight);
    this.bg.strokeRect(0, 0, this.panelWidth, this.panelHeight);
  }

  updatePRs(prs: PRData[]): void {
    // Detect newly merged PRs
    prs.forEach(pr => {
      if (pr.status === 'merged' && !this.mergedPRs.has(pr.number)) {
        this.mergedPRs.add(pr.number);
        this.playMergeAnimation();
      }
    });

    this.prs = prs;
    this.itemContainers.forEach(c => c.destroy());
    this.itemContainers = [];

    prs.slice(0, 4).forEach((pr, i) => {
      const ciIcon = CI_ICON[pr.ci] ?? '❓';
      const color = STATUS_COLOR[pr.status] ?? '#ffffff';
      const label = `▸ PR #${pr.number} "${pr.title.substring(0, 22)}" — ${ciIcon}`;

      const container = this.scene.add.container(0, 26 + i * 16);
      const t = this.scene.add.text(10, 0, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color,
        wordWrap: { width: this.panelWidth - 20 },
      });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setAlpha(0.7));
      t.on('pointerout', () => t.setAlpha(1));
      t.on('pointerup', () => {
        if (pr.url) window.open(pr.url, '_blank');
      });

      container.add(t);
      this.add(container);
      this.itemContainers.push(container);
    });
  }

  private playMergeAnimation(): void {
    // Draw pixel chest that opens
    const g = this.scene.add.graphics();
    const cx = this.x + this.panelWidth / 2;
    const cy = this.y + this.panelHeight / 2;
    const S = 4;

    let lid = 0;
    const timer = this.scene.time.addEvent({
      delay: 80,
      callback: () => {
        g.clear();
        g.setDepth(300);

        // Chest body
        g.fillStyle(0x885500);
        g.fillRect(cx - 5 * S, cy + lid, 10 * S, 8 * S);
        // Metal bands
        g.fillStyle(0xccaa00);
        g.fillRect(cx - 5 * S, cy + lid + 2 * S, 10 * S, S);

        // Lid (opens upward)
        g.fillStyle(0xaa7700);
        g.fillRect(cx - 5 * S, cy - lid, 10 * S, 3 * S);

        // Gold coins flying out
        if (lid > 10) {
          g.fillStyle(0xffdd00);
          [-2, 0, 2].forEach(dx => {
            g.fillRect(cx + dx * S, cy - lid - 8 * S + Math.random() * 4, 2 * S, 2 * S);
          });
        }

        lid = Math.min(lid + 3, 28);
      },
      repeat: 18,
    });

    this.scene.time.delayedCall(1800, () => {
      g.destroy();
      timer.destroy();
    });

    // Celebración text
    const txt = this.scene.add.text(cx, cy - 40, '🎉 MERGED!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#cc44ff',
    }).setOrigin(0.5).setDepth(301);
    this.scene.tweens.add({
      targets: txt,
      y: cy - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => txt.destroy(),
    });
  }

  resize(panelWidth: number, panelHeight: number): void {
    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;
    this.drawBg();
    this.updatePRs(this.prs);
  }
}
