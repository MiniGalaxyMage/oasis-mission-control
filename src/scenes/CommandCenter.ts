import Phaser from 'phaser';
import { SnapshotData } from '../types';
import { Agent } from '../entities/Agent';
import { TaskBoard } from '../entities/TaskBoard';
import { PRMonitor } from '../entities/PRMonitor';
import { HeartbeatPulse } from '../entities/HeartbeatPulse';
import { CastleRoom } from '../entities/CastleRoom';
import { ForgeSmith } from '../entities/Forge';
import { TreasureChest } from '../entities/TreasureChest';

// Konami code sequence
const KONAMI = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'KeyB','KeyA',
];

export class CommandCenter extends Phaser.Scene {
  private snapshot: SnapshotData | null = null;
  private agentSprites: Map<string, Agent> = new Map();
  private taskBoard: TaskBoard | null = null;
  private prMonitor: PRMonitor | null = null;
  private heartbeat: HeartbeatPulse | null = null;
  private castleRoom: CastleRoom | null = null;
  private forgeSmith: ForgeSmith | null = null;
  private treasureChest: TreasureChest | null = null;
  private refreshTimer = 0;
  private readonly REFRESH_INTERVAL = 30000;
  private konamiBuffer: string[] = [];
  private konamiMsg: Phaser.GameObjects.Text | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private clockText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'CommandCenter' });
  }

  preload(): void {
    // Everything drawn programmatically — no external assets
  }

  create(): void {
    this.loadSnapshot().then(snap => {
      this.snapshot = snap;
      this.buildCastleScene();
    });

    // Konami Easter Egg
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      this.konamiBuffer.push(e.code);
      if (this.konamiBuffer.length > KONAMI.length) this.konamiBuffer.shift();
      if (JSON.stringify(this.konamiBuffer) === JSON.stringify(KONAMI)) {
        this.triggerKonami();
      }
    });

    // Torch easter egg: click any torch area
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.castleRoom) return;
      const { torch1X, torch2X, torchY } = this.castleRoom.layout;
      for (const tx of [torch1X, torch2X]) {
        if (Math.abs(pointer.x - tx) < 20 && Math.abs(pointer.y - torchY) < 30) {
          this.torchEasterEgg(tx, torchY);
        }
      }
    });

    // Scale / resize
    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }

  private async loadSnapshot(): Promise<SnapshotData> {
    try {
      const res = await fetch('./data/snapshot.json?t=' + Date.now());
      return await res.json() as SnapshotData;
    } catch (e) {
      console.warn('Failed to load snapshot.json', e);
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

  private buildCastleScene(): void {
    if (!this.snapshot) return;
    const W = this.scale.width;
    const H = this.scale.height;

    // === CASTLE ROOM BACKGROUND ===
    this.castleRoom = new CastleRoom(this);
    const layout = this.castleRoom.layout;

    // === FORGE / SMITHY ===
    this.forgeSmith = new ForgeSmith(this, layout.smithyX, layout.smithyY);

    // === TASK BOARD (quest board on right wall) ===
    const tbW = Math.floor(W * 0.28);
    const tbH = Math.floor((layout.floorY - layout.wallTopY) * 0.72);
    this.taskBoard = new TaskBoard(
      this,
      layout.questBoardX,
      layout.questBoardY,
      tbW,
      tbH,
    );
    this.taskBoard.updateTasks(this.snapshot.tasks);

    // === PR MONITOR (scrolls on left wall) ===
    const prW = Math.floor(W * 0.28);
    const prH = Math.floor((layout.floorY - layout.wallTopY) * 0.72);
    this.prMonitor = new PRMonitor(
      this,
      layout.scrollsX,
      layout.scrollsY,
      prW,
      prH,
    );
    this.prMonitor.updatePRs(this.snapshot.pullRequests);

    // === HEARTBEAT CRYSTAL ===
    this.heartbeat = new HeartbeatPulse(this, layout.gemX, layout.gemY, this.snapshot.heartbeat);
    this.heartbeat.setDepth(6);

    // === TREASURE CHEST ===
    this.treasureChest = new TreasureChest(this, layout.chestX, layout.chestY);
    const hasMerged = this.snapshot.pullRequests.some(pr => pr.status === 'merged');
    this.treasureChest.setHasMergedPRs(hasMerged);

    // === AGENTS ===
    this.buildAgents();

    // === HUD ===
    this.buildHUD(W, H);
  }

  private buildAgents(): void {
    if (!this.snapshot || !this.castleRoom) return;
    const layout = this.castleRoom.layout;
    const { W, H, floorY } = layout;
    const floorCenterY = Math.floor(floorY + (H - floorY) * 0.55);

    this.snapshot.agents.forEach((agentData) => {
      const isPercival = agentData.id === 'percival';
      // Initial position
      const startX = isPercival ? Math.floor(W * 0.5) : Math.floor(W * 0.3);
      const startY = floorCenterY;

      const agent = new Agent(this, startX, startY, agentData);
      agent.setDepth(7);
      this.add.existing(agent);
      this.agentSprites.set(agentData.id, agent);

      if (isPercival) {
        // Percival wanders around the strategy table area
        const wanderPoints = [
          { x: layout.tableX - 80, y: floorCenterY },
          { x: layout.tableX, y: floorCenterY - 10 },
          { x: layout.tableX + 80, y: floorCenterY },
          { x: layout.tableX + 40, y: Math.floor(floorY + (H - floorY) * 0.75) },
          { x: Math.floor(W * 0.55), y: Math.floor(floorY + (H - floorY) * 0.85) },
        ];
        agent.setIdleWaypoints(wanderPoints);

        // If orchestrating/thinking → go to strategy table
        if (agentData.status === 'orchestrating' || agentData.status === 'thinking') {
          agent.setTaskTarget({ x: layout.tableX, y: floorCenterY });
        }
      } else {
        // Forge agents wander in their zone
        const forgeWander = [
          { x: Math.floor(W * 0.25), y: floorCenterY },
          { x: Math.floor(W * 0.35), y: floorCenterY },
          { x: Math.floor(W * 0.3), y: Math.floor(floorY + (H - floorY) * 0.8) },
          { x: Math.floor(W * 0.4), y: Math.floor(floorY + (H - floorY) * 0.75) },
        ];
        // Offset multiple forge agents so they don't stack
        const forgeIndex = [...this.agentSprites.keys()].filter(k => k !== 'percival').indexOf(agentData.id);
        const offsetX = forgeIndex * 60;
        agent.setIdleWaypoints(forgeWander.map(wp => ({ x: wp.x + offsetX, y: wp.y })));

        // If working → go to anvil
        if (agentData.status === 'working') {
          const anvX = layout.smithyX + 10 + forgeIndex * 20;
          agent.setTaskTarget({ x: anvX, y: layout.smithyY - 10 });
          if (this.forgeSmith) this.forgeSmith.setActive(true);
        }
      }
    });
  }

  private buildHUD(W: number, H: number): void {
    if (!this.snapshot) return;
    // Top bar
    const bar = this.add.graphics().setDepth(20);
    bar.fillStyle(0x0a0808, 0.85);
    bar.fillRect(0, 0, W, 30);
    bar.lineStyle(1, 0x6b3a18, 0.8);
    bar.lineBetween(0, 30, W, 30);

    // Title
    this.titleText = this.add.text(14, 15, '⚔  OASIS MISSION CONTROL  ⚔', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#cc8822',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(21);
    this.titleText.setInteractive({ useHandCursor: true });
    this.titleText.on('pointerdown', () => this.triggerGlitch());

    // Clock
    this.clockText = this.add.text(W - 14, 15, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#887744',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(21);

    // Bottom status bar
    const botBar = this.add.graphics().setDepth(20);
    botBar.fillStyle(0x0a0808, 0.85);
    botBar.fillRect(0, H - 24, W, 24);
    botBar.lineStyle(1, 0x6b3a18, 0.8);
    botBar.lineBetween(0, H - 24, W, H - 24);

    const s = this.snapshot.stats;
    const statsLine = `⚜ ${s.agentsActive} agentes  |  ✓ ${s.tasksCompleted} tareas  |  PR ${s.prsToday} hoy`;
    this.add.text(W / 2, H - 12, statsLine, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: '#887744',
    }).setOrigin(0.5, 0.5).setDepth(21);

    // Last updated
    const ts = new Date(this.snapshot.timestamp).toLocaleTimeString('es-ES');
    this.add.text(W - 12, H - 12, `↺ ${ts}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '4px',
      color: '#665533',
    }).setOrigin(1, 0.5).setDepth(21);
  }

  update(_time: number, delta: number): void {
    // Torches
    if (this.castleRoom) this.castleRoom.updateTorches(delta);

    // Forge fire
    if (this.forgeSmith) this.forgeSmith.update(delta);

    // Agents
    this.agentSprites.forEach(agent => agent.update(delta));

    // Heartbeat crystal
    if (this.heartbeat) this.heartbeat.update(delta);

    // Treasure chest
    if (this.treasureChest) this.treasureChest.update(delta);

    // Clock
    if (this.clockText) {
      const now = new Date();
      this.clockText.setText(now.toLocaleTimeString('es-ES'));
    }

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

    snap.agents.forEach(agentData => {
      const sprite = this.agentSprites.get(agentData.id);
      if (sprite) {
        sprite.updateData(agentData);
        // Reposition to task if status changed
        if (!this.castleRoom) return;
        const layout = this.castleRoom.layout;
        const { W, H, floorY } = layout;
        const floorCenterY = Math.floor(floorY + (H - floorY) * 0.55);
        if (agentData.id === 'percival') {
          if (agentData.status === 'orchestrating' || agentData.status === 'thinking') {
            sprite.setTaskTarget({ x: layout.tableX, y: floorCenterY });
          }
        } else {
          if (agentData.status === 'working') {
            sprite.setTaskTarget({ x: layout.smithyX + 10, y: layout.smithyY - 10 });
            if (this.forgeSmith) this.forgeSmith.setActive(true);
          } else {
            if (this.forgeSmith) this.forgeSmith.setActive(false);
          }
        }
      }
    });

    if (this.taskBoard) this.taskBoard.updateTasks(snap.tasks);
    if (this.prMonitor) this.prMonitor.updatePRs(snap.pullRequests);
    if (this.heartbeat) this.heartbeat.updateData(snap.heartbeat);
    if (this.treasureChest) {
      const hasMerged = snap.pullRequests.some(pr => pr.status === 'merged');
      this.treasureChest.setHasMergedPRs(hasMerged);
    }
  }

  // Easter egg 1: Konami code
  private triggerKonami(): void {
    if (this.konamiMsg) return;
    const W = this.scale.width;
    const H = this.scale.height;
    this.konamiMsg = this.add.text(
      W / 2, H / 2,
      '> Going outside is highly overrated <',
      {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#00ff88',
        backgroundColor: '#000000',
        padding: { x: 20, y: 12 },
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(500);

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

  // Easter egg 2: Torch color change on click
  private torchEasterEgg(tx: number, ty: number): void {
    const g = this.add.graphics().setDepth(10);
    const colors = [0xff00ff, 0x00ffff, 0x00ff00, 0xffffff];
    let ci = 0;
    const timer = this.time.addEvent({
      delay: 100,
      repeat: 8,
      callback: () => {
        g.clear();
        g.fillStyle(colors[ci % colors.length], 0.3);
        g.fillCircle(tx, ty - 20, 25);
        ci++;
      },
    });
    this.time.delayedCall(1000, () => { timer.destroy(); g.destroy(); });
  }

  // Easter egg 3: Title glitch
  private triggerGlitch(): void {
    const originalText = '⚔  OASIS MISSION CONTROL  ⚔';
    const glitchChars = '!@#$%^&*<>?/|\\{}[]';
    let count = 0;
    const interval = setInterval(() => {
      if (count++ >= 10 || !this.titleText) {
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

  // Matrix rain
  private spawnMatrixRain(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cols = Math.floor(W / 12);
    const drops: number[] = new Array(cols).fill(0).map(() => Phaser.Math.Between(-H, 0));
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&⚔⚒⚜♥';
    const g = this.add.graphics().setDepth(490);
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff88',
    };
    const texts: Phaser.GameObjects.Text[] = [];

    const timer = this.time.addEvent({
      delay: 60,
      callback: () => {
        g.clear();
        g.fillStyle(0x000000, 0.05);
        g.fillRect(0, 0, W, H);
        drops.forEach((y, i) => {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const txt = this.add.text(i * 12, y, char, style).setDepth(495);
          texts.push(txt);
          this.time.delayedCall(200, () => txt.destroy());
          drops[i] += 14;
          if (drops[i] > H && Math.random() > 0.975) drops[i] = 0;
        });
      },
      repeat: 55,
    });
    this.time.delayedCall(3600, () => { timer.destroy(); g.destroy(); });
  }
}
