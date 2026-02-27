import Phaser from 'phaser';
import { PRData } from '../types';

/**
 * PRMonitor — pergaminos en la pared derecha mostrando PRs.
 * Click → abre URL de GitHub.
 */
export class PRMonitor {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(590, 120);
    this.container.setDepth(8);
  }

  create(prs: PRData[]): void {
    this.container.removeAll(true);

    // Marco principal (pared derecha)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a2042, 0.6);
    bg.fillRect(0, 0, 160, 200);
    bg.lineStyle(1, 0x4a4a6a);
    bg.strokeRect(0, 0, 160, 200);
    this.container.add(bg);

    // Título
    const title = this.scene.add.text(80, 8, '📜 PRs', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ccaa66',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    const visible = prs.slice(0, 6);
    visible.forEach((pr, i) => {
      this.createPRScroll(pr, i);
    });

    if (prs.length === 0) {
      const empty = this.scene.add.text(80, 100, 'Sin PRs', {
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#666688',
      }).setOrigin(0.5, 0.5);
      this.container.add(empty);
    }
  }

  private createPRScroll(pr: PRData, index: number): void {
    const y = 24 + index * 29;
    const bgColor = this.getStatusBgColor(pr.status, pr.ci);
    const textColor = this.getStatusTextColor(pr.status);
    const ciIcon = this.getCIIcon(pr.ci);

    // Fondo del pergamino
    const scrollBg = this.scene.add.graphics();
    scrollBg.fillStyle(bgColor, 0.85);
    scrollBg.fillRect(6, y, 148, 24);
    scrollBg.lineStyle(1, 0x888866, 0.6);
    scrollBg.strokeRect(6, y, 148, 24);
    this.container.add(scrollBg);

    // Número de PR
    const numText = this.scene.add.text(12, y + 4, `#${pr.number}`, {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffdd88',
    });
    this.container.add(numText);

    // CI icon
    const ciText = this.scene.add.text(142, y + 4, ciIcon, {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(1, 0);
    this.container.add(ciText);

    // Título del PR (truncado)
    const titleText = this.scene.add.text(12, y + 14, truncate(pr.title, 22), {
      fontSize: '5px',
      fontFamily: '"Press Start 2P", monospace',
      color: textColor,
    });
    this.container.add(titleText);

    // Zona interactiva para abrir URL
    const hitArea = this.scene.add.zone(6, y, 148, 24).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      window.open(pr.url, '_blank');
    });
    hitArea.on('pointerover', () => {
      scrollBg.setAlpha(1.2);
    });
    hitArea.on('pointerout', () => {
      scrollBg.setAlpha(1);
    });
    this.container.add(hitArea);
  }

  private getStatusBgColor(status: PRData['status'], ci: PRData['ci']): number {
    if (ci === 'failing') return 0x3d1010;
    if (status === 'merged') return 0x103d20;
    if (status === 'draft') return 0x1a1a30;
    return 0x1e1e3a;
  }

  private getStatusTextColor(status: PRData['status']): string {
    if (status === 'merged') return '#44ff88';
    if (status === 'closed') return '#888888';
    if (status === 'draft') return '#8888aa';
    return '#ccccee';
  }

  private getCIIcon(ci: PRData['ci']): string {
    switch (ci) {
      case 'passing':
      case 'passed': return '✓';
      case 'failing': return '✗';
      case 'running': return '⟳';
      default: return '?';
    }
  }

  update(prs: PRData[]): void {
    this.create(prs);
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}
