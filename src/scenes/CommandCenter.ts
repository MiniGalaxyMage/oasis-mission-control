import Phaser from 'phaser';
import { SnapshotData } from '../types';
import { Agent } from '../entities/Agent';
import { TaskBoard } from '../entities/TaskBoard';
import { PRMonitor } from '../entities/PRMonitor';
import { HeartbeatPulse } from '../entities/HeartbeatPulse';

// Konami code sequence
const KONAMI = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'KeyB','KeyA',
];

export class CommandCenter extends Phaser.Scene {
  private snapshot: SnapshotData | null = null;
  private agentSprites: Map<string, Agent> = new Map();
  private taskBoard!: TaskBoard;
  private prMonitor!: PRMonitor;
  private heartbeat!: HeartbeatPulse;
  private titleText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private refreshTimer = 0;
  private readonly REFRESH_INTERVAL = 30000;
  private stars: Array<{ x: number; y: number; s: number; t: number }> = [];
  private starGraphics!: Phaser.GameObjects.Graphics;
  private dividers: Phaser.GameObjects.Graphics[] = [];
  private konamiBuffer: string[] = [];
  private konamiMsg: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'CommandCenter' });
  }

  preload(): void {
    // No external assets — everything drawn programmatically
  }

  create(): void {
    this.buildStarfield();
    this.loadSnapshot().then(snap => {
      this.snapshot = snap;
      this.buildUI();
    });

    // Keyboard easter egg: Konami
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      this.konamiBuffer.push(e.code);
      if (this.konamiBuffer.length > KONAMI.length) this.konamiBuffer.shift();
      if (JSON.stringify(this.konamiBuffer) === JSON.stringify(KONAMI)) {
        this.triggerKonami();
      }
    });

    // Scale listener
    this.scale.on('resize', this.onResize, this);
  }

  private buildStarfield(): void {
    this.starGraphics = this.add.graphics();
    const W = this.scale.width;
    const H = this.scale.height;

    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        s: Phaser.Math.Between(1, 3),
        t: Math.random() * Math.PI * 2,
      });
    }
  }

  private async loadSnapshot(): Promise<SnapshotData> {
    try {
      const res = await fetch('./data/snapshot.json?t=' + Date.now());
      return await res.json() as SnapshotData;
    } catch (e) {
      console.warn('Failed to load snapshot.json', e);
      // Return minimal fallback
      return {
        timestamp: new Date().toISOString(),
        heartbeat: { lastCheck: new Date().toISOString(), status: 'warn' },
        agents: [],
        tasks: [],
        pullRequests: [],
        stats: { prsToday: 0, tasksCompleted: 0, agentsActive: 0 },
      };
    }
  }

  private buildUI(): void {
    if (!this.snapshot) return;
    const W = this.scale.width;
    const H = this.scale.height;

    // Header bar
    const header = this.add.graphics();
    header.fillStyle(0x111133, 1);
    header.fillRect(0, 0, W, 36);
    header.lineStyle(1, 0x4466ff, 0.6);
    header.lineBetween(0, 36, W, 36);

    // Title
    this.titleText = this.add.text(14, 10, '🎮 OASIS MISSION CONTROL', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#00ccff',
    });
    this.titleText.setInteractive({ useHandCursor: true });
    this.titleText.on('pointerup', () => this.triggerGlitch());

    // Heartbeat (top right)
    const hb = this.snapshot.heartbeat;
    this.heartbeat = new HeartbeatPulse(this, W - 120, 18, hb);
    this.heartbeat.setDepth(10);

    // Agent section
    this.buildAgentSection(W, H);

    // Panels (task board + PR monitor)
    this.buildPanels(W, H);

    // Stats bar
    this.buildStatsBar(W, H);
  }

  private buildAgentSection(W: number, H: number): void {
    if (!this.snapshot) return;
    const agents = this.snapshot.agents;

    // Section header
    const agentY = 50;
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x333366, 0.7);
    divider.lineBetween(0, agentY, W, agentY);
    this.dividers.push(divider);

    const cardW = 100;
    const totalW = agents.length * (cardW + 16) - 16;
    const startX = (W - totalW) / 2 + cardW / 2;
    const agentCenterY = agentY + 90;

    agents.forEach((agentData, i) => {
      const ax = startX + i * (cardW + 16);
      const sprite = new Agent(this, ax, agentCenterY, agentData);
      sprite.setDepth(5);
      this.agentSprites.set(agentData.id, sprite);
    });
  }

  private buildPanels(W: number, H: number): void {
    if (!this.snapshot) return;
    const panelTop = 230;
    const panelH = Math.floor((H - panelTop - 40) / 2);
    const panelW = W - 20;

    // Task board
    this.taskBoard = new TaskBoard(this, 10, panelTop, panelW, panelH);
    this.taskBoard.updateTasks(this.snapshot.tasks);
    this.taskBoard.setDepth(5);

    // PR Monitor
    const prTop = panelTop + panelH + 8;
    this.prMonitor = new PRMonitor(this, 10, prTop, panelW, panelH);
    this.prMonitor.updatePRs(this.snapshot.pullRequests);
    this.prMonitor.setDepth(5);
  }

  private buildStatsBar(W: number, H: number): void {
    if (!this.snapshot) return;
    const stats = this.snapshot.stats;
    const barY = H - 28;

    const bar = this.add.graphics();
    bar.fillStyle(0x111133, 1);
    bar.fillRect(0, barY, W, 28);
    bar.lineStyle(1, 0x333366, 0.7);
    bar.lineBetween(0, barY, W, barY);

    this.statsText = this.add.text(14, barY + 8, 
      `📊 STATS: ${stats.prsToday} PRs hoy | ${stats.tasksCompleted} tareas completadas | ${stats.agentsActive} agentes activos`,
      {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: '#888888',
      });
  }

  private onResize(_gameSize: Phaser.Structs.Size): void {
    // Rebuild everything on resize
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.scene.restart();
  }

  update(time: number, delta: number): void {
    // Animate stars
    this.starGraphics.clear();
    this.stars.forEach(star => {
      star.t += delta * 0.001;
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(star.t));
      const color = [0x4444aa, 0x224488, 0x446688][star.s % 3];
      this.starGraphics.fillStyle(color, alpha);
      this.starGraphics.fillRect(star.x, star.y, star.s, star.s);
    });

    // Update agents
    this.agentSprites.forEach(sprite => sprite.update(delta));

    // Heartbeat
    if (this.heartbeat) this.heartbeat.update(delta);

    // Auto-refresh
    this.refreshTimer += delta;
    if (this.refreshTimer >= this.REFRESH_INTERVAL) {
      this.refreshTimer = 0;
      this.doRefresh();
    }
  }

  private async doRefresh(): Promise<void> {
    const snap = await this.loadSnapshot();
    this.snapshot = snap;

    // Update agents
    snap.agents.forEach(agentData => {
      const sprite = this.agentSprites.get(agentData.id);
      if (sprite) {
        sprite.updateData(agentData);
      }
    });

    // Update panels
    if (this.taskBoard) this.taskBoard.updateTasks(snap.tasks);
    if (this.prMonitor) this.prMonitor.updatePRs(snap.pullRequests);
    if (this.heartbeat) this.heartbeat.updateData(snap.heartbeat);
    if (this.statsText) {
      const s = snap.stats;
      this.statsText.setText(
        `📊 STATS: ${s.prsToday} PRs hoy | ${s.tasksCompleted} tareas completadas | ${s.agentsActive} agentes activos`
      );
    }
  }

  // Easter egg 1: Konami code
  private triggerKonami(): void {
    if (this.konamiMsg) return;
    this.konamiMsg = this.add.text(
      this.scale.width / 2, this.scale.height / 2,
      '> Going outside is highly overrated <',
      {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#00ff88',
        backgroundColor: '#000000',
        padding: { x: 16, y: 10 },
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(500);

    // Matrix rain effect
    this.spawnMatrixRain();

    this.time.delayedCall(4000, () => {
      if (this.konamiMsg) {
        this.tweens.add({
          targets: this.konamiMsg,
          alpha: 0,
          duration: 600,
          onComplete: () => {
            this.konamiMsg?.destroy();
            this.konamiMsg = null;
          },
        });
      }
    });
  }

  // Easter egg 2: Title glitch
  private triggerGlitch(): void {
    const container = document.getElementById('game-container');
    if (container) {
      container.parentElement?.classList.add('glitch-active');
      setTimeout(() => container.parentElement?.classList.remove('glitch-active'), 600);
    }

    // Also glitch the title text
    const originalText = '🎮 OASIS MISSION CONTROL';
    const glitchChars = '!@#$%^&*<>?/|\\{}[]';
    let count = 0;
    const interval = setInterval(() => {
      if (count++ >= 8) {
        clearInterval(interval);
        if (this.titleText) this.titleText.setText(originalText);
        return;
      }
      const glitched = originalText.split('').map(c =>
        Math.random() < 0.3 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : c
      ).join('');
      if (this.titleText) this.titleText.setText(glitched);
    }, 60);
  }

  // Matrix-style character rain
  private spawnMatrixRain(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cols = Math.floor(W / 12);
    const drops: number[] = new Array(cols).fill(0).map(() => Phaser.Math.Between(-H, 0));
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&';

    const g = this.add.graphics().setDepth(490);
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff88',
    };
    const textObjects: Phaser.GameObjects.Text[] = [];

    const timer = this.time.addEvent({
      delay: 60,
      callback: () => {
        g.clear();
        g.fillStyle(0x000000, 0.05);
        g.fillRect(0, 0, W, H);

        drops.forEach((y, i) => {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const txt = this.add.text(i * 12, y, char, style).setDepth(495);
          textObjects.push(txt);
          this.time.delayedCall(200, () => txt.destroy());

          drops[i] += 14;
          if (drops[i] > H && Math.random() > 0.975) drops[i] = 0;
        });
      },
      repeat: 50,
    });

    this.time.delayedCall(3500, () => {
      timer.destroy();
      g.destroy();
    });
  }
}
