import Phaser from 'phaser';
import { SnapshotData, AgentData } from '../types';
import { Agent } from '../entities/Agent';

/**
 * CommandCenter — Escena principal OASIS Mission Control.
 * Fondo: castle-room-bg.png (Gemini pixel art isométrico).
 * Personajes: spritesheets con animación idle 4 frames.
 */
export class CommandCenter extends Phaser.Scene {
  private snapshot: SnapshotData | null = null;
  private refreshTimer: Phaser.Time.TimerEvent | null = null;

  // Agentes — mapa por ID, se crean UNA VEZ
  private agents: Map<string, Agent> = new Map();

  // Info panels
  private taskBg!: Phaser.GameObjects.Graphics;
  private taskText!: Phaser.GameObjects.Text;
  private prBg!: Phaser.GameObjects.Graphics;
  private prText!: Phaser.GameObjects.Text;
  private heartbeatBg!: Phaser.GameObjects.Graphics;
  private heartbeatText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private timestampText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CommandCenter' });
  }

  // ─────────────────────────────────────────────────────────────
  // PRELOAD
  // ─────────────────────────────────────────────────────────────
  preload(): void {
    // Fondo de sala de castillo Zelda
    this.load.image('castle-room-bg', '/assets/room/castle-room-bg.png');

    // Spritesheets de personajes — todos 1024x1024, 4 frames en fila
    this.load.spritesheet('percival-sheet', '/assets/sprites/percival-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('forge-sheet', '/assets/sprites/forge-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('sprite-sheet', '/assets/sprites/sprite-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });

    // Pantalla de carga
    const loadText = this.add.text(400, 300, '⚔️  Cargando OASIS...', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffdd44',
    }).setOrigin(0.5);

    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x1a1a2e);
    progressBg.fillRect(250, 330, 300, 10);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4444cc);
      progressBar.fillRect(250, 330, 300 * value, 10);
    });

    this.load.on('complete', () => {
      loadText.destroy();
      progressBg.destroy();
      progressBar.destroy();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  create(): void {
    // 1. Fondo: imagen de Gemini escalada a 800x600
    const bg = this.add.image(400, 300, 'castle-room-bg');
    bg.setDisplaySize(800, 600);
    bg.setDepth(0);

    // 2. Animaciones de personajes (definir una sola vez)
    this.createAnimations();

    // 3. UI: título y timestamp
    this.createUI();

    // 4. Paneles de info
    this.createInfoPanels();

    // 5. Cargar datos (crea agentes la primera vez)
    this.applyFallbackSnapshot();
    this.loadSnapshot();

    // 6. Auto-refresh 30s
    this.refreshTimer = this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => this.loadSnapshot(),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ANIMACIONES
  // ─────────────────────────────────────────────────────────────
  private createAnimations(): void {
    // Idle animaciones — 4 frames, 2 FPS, loop
    const defs = [
      { key: 'percival-idle', sheet: 'percival-sheet' },
      { key: 'forge-idle', sheet: 'forge-sheet' },
      { key: 'sprite-idle', sheet: 'sprite-sheet' },
    ];

    for (const { key, sheet } of defs) {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }),
          frameRate: 2,
          repeat: -1,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // UI ESTÁTICA
  // ─────────────────────────────────────────────────────────────
  private createUI(): void {
    // Banda oscura superior para el título
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x0a0a1a, 0.75);
    titleBg.fillRect(0, 0, 800, 38);
    titleBg.setDepth(18);

    this.titleText = this.add.text(400, 10, '⚔️  OASIS MISSION CONTROL', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(19);

    this.timestampText = this.add.text(790, 594, '', {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#aaaacc',
    }).setOrigin(1, 1).setDepth(19);
  }

  // ─────────────────────────────────────────────────────────────
  // PANELES DE INFO
  // ─────────────────────────────────────────────────────────────
  private createInfoPanels(): void {
    // Panel Tareas — esquina inf-izquierda
    this.taskBg = this.add.graphics().setDepth(15);
    this.taskText = this.add.text(10, 500, '', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ccffcc',
      wordWrap: { width: 180 },
    }).setDepth(16);

    // Panel PRs — esquina inf-derecha
    this.prBg = this.add.graphics().setDepth(15);
    this.prText = this.add.text(610, 460, '', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ccccff',
      wordWrap: { width: 180 },
    }).setDepth(16);

    // Panel Heartbeat — banda inferior central
    this.heartbeatBg = this.add.graphics().setDepth(15);
    this.heartbeatText = this.add.text(400, 572, '', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffeeaa',
    }).setOrigin(0.5, 1).setDepth(16);
  }

  private updateInfoPanels(data: SnapshotData): void {
    // — Tareas —
    const recentTasks = data.tasks.slice(0, 5);
    const taskLines = ['📋 TAREAS', '─────────────', ...recentTasks.map(t =>
      `${t.status === 'done' ? '✓' : '○'} ${truncate(t.title ?? t.id, 22)}`
    )];
    if (recentTasks.length === 0) taskLines.push('Sin tareas activas');
    const taskStr = taskLines.join('\n');
    this.taskText.setText(taskStr);
    const tb = this.taskText.getBounds();
    this.taskBg.clear();
    this.taskBg.fillStyle(0x0a0a1e, 0.82);
    this.taskBg.fillRoundedRect(tb.x - 6, tb.y - 5, tb.width + 12, tb.height + 10, 4);
    this.taskBg.lineStyle(1, 0x3333aa);
    this.taskBg.strokeRoundedRect(tb.x - 6, tb.y - 5, tb.width + 12, tb.height + 10, 4);

    // — PRs —
    const recentPRs = data.pullRequests.slice(0, 4);
    const prLines = ['🔀 PULL REQUESTS', '─────────────', ...recentPRs.map(pr =>
      `#${pr.number ?? '?'} ${truncate(pr.title ?? '', 20)}`
    )];
    if (recentPRs.length === 0) prLines.push('Sin PRs abiertos');
    this.prText.setText(prLines.join('\n'));
    const pb = this.prText.getBounds();
    this.prBg.clear();
    this.prBg.fillStyle(0x0a0a1e, 0.82);
    this.prBg.fillRoundedRect(pb.x - 6, pb.y - 5, pb.width + 12, pb.height + 10, 4);
    this.prBg.lineStyle(1, 0x3333aa);
    this.prBg.strokeRoundedRect(pb.x - 6, pb.y - 5, pb.width + 12, pb.height + 10, 4);

    // — Heartbeat —
    const hb = data.heartbeat;
    const hbColor = hb.status === 'ok' ? '#44ff88' : hb.status === 'warn' ? '#ffdd44' : '#ff4444';
    const hbIcon = hb.status === 'ok' ? '💚' : hb.status === 'warn' ? '💛' : '❤️';
    const hbStr = `${hbIcon} HEARTBEAT: ${hb.status.toUpperCase()}  ·  ${new Date(hb.lastCheck).toLocaleTimeString('es-ES')}`;
    this.heartbeatText.setText(hbStr);
    this.heartbeatText.setColor(hbColor);
    const hbb = this.heartbeatText.getBounds();
    this.heartbeatBg.clear();
    this.heartbeatBg.fillStyle(0x0a0a1e, 0.82);
    this.heartbeatBg.fillRoundedRect(hbb.x - 8, hbb.y - 4, hbb.width + 16, hbb.height + 8, 4);
    this.heartbeatBg.lineStyle(1, 0x224422);
    this.heartbeatBg.strokeRoundedRect(hbb.x - 8, hbb.y - 4, hbb.width + 16, hbb.height + 8, 4);
  }

  // ─────────────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────────────────
  private async loadSnapshot(): Promise<void> {
    try {
      const res = await fetch('/data/snapshot.json?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SnapshotData = await res.json();
      this.applySnapshot(data);
    } catch (err) {
      console.warn('[CommandCenter] No se pudo cargar snapshot:', err);
      if (!this.snapshot) this.applyFallbackSnapshot();
    }
  }

  private applySnapshot(data: SnapshotData): void {
    this.snapshot = data;
    this.timestampText.setText(new Date(data.timestamp).toLocaleTimeString('es-ES'));

    // Resolver agentes a mostrar
    const forgeAgent = data.agents.find(a => a.id === 'forge-alpha')
      ?? data.agents.find(a => a.id.startsWith('forge'));

    const agentsToDisplay: AgentData[] = [
      data.agents.find(a => a.id === 'percival')
        ?? { id: 'percival', name: 'Percival', status: 'idle', currentTask: null, model: 'opus' },
      forgeAgent
        ? { ...forgeAgent, id: 'forge-alpha' }
        : { id: 'forge-alpha', name: 'Forge Alpha', status: 'idle', currentTask: null, model: 'sonnet' },
      data.agents.find(a => a.id === 'sprite')
        ?? { id: 'sprite', name: 'Sprite', status: 'idle', currentTask: null, model: 'gemini' },
    ];

    agentsToDisplay.forEach(agentData => {
      if (this.agents.has(agentData.id)) {
        this.agents.get(agentData.id)!.update(agentData);
      } else {
        const agent = new Agent(this, agentData);
        this.agents.set(agentData.id, agent);
      }
    });

    this.updateInfoPanels(data);
  }

  private applyFallbackSnapshot(): void {
    const fallback: SnapshotData = {
      timestamp: new Date().toISOString(),
      heartbeat: { lastCheck: new Date().toISOString(), status: 'warn' },
      agents: [
        { id: 'percival',    name: 'Percival',    status: 'idle', currentTask: null, model: 'opus' },
        { id: 'forge-alpha', name: 'Forge Alpha',  status: 'idle', currentTask: null, model: 'sonnet' },
        { id: 'sprite',      name: 'Sprite',       status: 'idle', currentTask: null, model: 'gemini' },
      ],
      tasks: [],
      pullRequests: [],
      stats: { prsToday: 0, tasksCompleted: 0, agentsActive: 0 },
    };
    this.applySnapshot(fallback);
  }

  update(): void {
    // Sin lógica en el loop — todo via tweens y timers
  }
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
