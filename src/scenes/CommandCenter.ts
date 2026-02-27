import Phaser from 'phaser';
import { SnapshotData, AgentData } from '../types';
import { CastleRoom } from '../entities/CastleRoom';
import { Agent } from '../entities/Agent';
import { ForgeArea } from '../entities/ForgeArea';
import { TaskBoard } from '../entities/TaskBoard';
import { PRMonitor } from '../entities/PRMonitor';
import { HeartbeatPulse } from '../entities/HeartbeatPulse';
import { TreasureChest } from '../entities/TreasureChest';

/**
 * CommandCenter — Escena principal OASIS Mission Control.
 * Estilo Zelda: A Link to the Past — habitación de castillo.
 *
 * Reglas de oro:
 * - Cada agente se crea UNA SOLA VEZ
 * - Los sprites se mueven con tweens LENTOS
 * - Sin overlays HTML, todo en Phaser
 */
export class CommandCenter extends Phaser.Scene {
  // Datos
  private snapshot: SnapshotData | null = null;
  private refreshTimer: Phaser.Time.TimerEvent | null = null;

  // Entidades de la escena
  private castleRoom!: CastleRoom;
  private forgeArea!: ForgeArea;
  private taskBoard!: TaskBoard;
  private prMonitor!: PRMonitor;
  private heartbeat!: HeartbeatPulse;
  private treasureChest!: TreasureChest;

  // Agentes — mapa por ID, se crean UNA VEZ
  private agents: Map<string, Agent> = new Map();

  // Antorchas
  private torch1Gfx!: Phaser.GameObjects.Graphics;
  private torch2Gfx!: Phaser.GameObjects.Graphics;

  // UI estática
  private titleText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private timestampText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CommandCenter' });
  }

  // ─────────────────────────────────────────────────────────────
  // PRELOAD
  // ─────────────────────────────────────────────────────────────
  preload(): void {
    // Sprites de agentes — 1024x1024, los cargamos como imagen simple
    // (mejor estático y limpio que animado con glitches)
    this.load.image('percival-idle',  'src/assets/sprites/percival-idle.png');
    this.load.image('forge-idle',     'src/assets/sprites/forge-idle.png');
    this.load.image('forge-working',  'src/assets/sprites/forge-working.png');
    this.load.image('sprite-idle',    'src/assets/sprites/sprite-idle.png');

    // Objetos
    this.load.image('anvil',          'src/assets/objects/anvil.png');
    this.load.image('easel',          'src/assets/objects/easel.png');
    this.load.image('strategy-table', 'src/assets/objects/strategy-table.png');
    this.load.image('treasure-chest', 'src/assets/objects/treasure-chest.png');

    // Pantalla de carga minimalista
    const loadText = this.add.text(400, 300, 'Cargando OASIS...', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#4444aa',
    }).setOrigin(0.5);

    this.load.on('complete', () => loadText.destroy());
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  async create(): Promise<void> {
    // 1. Habitación base
    this.castleRoom = new CastleRoom(this);
    this.castleRoom.create();

    // 2. Antorchas (pared superior)
    this.createTorches();

    // 3. Objetos del escenario
    this.createSceneObjects();

    // 4. UI estática (título, stats)
    this.createUI();

    // 5. Entidades informativas (con datos vacíos hasta que llegue el snapshot)
    this.taskBoard  = new TaskBoard(this);
    this.prMonitor  = new PRMonitor(this);
    this.heartbeat  = new HeartbeatPulse(this);
    this.treasureChest = new TreasureChest(this);

    // 6. Cargar snapshot y arrancar agentes
    await this.loadSnapshot();

    // 7. Auto-refresh cada 30 segundos
    this.refreshTimer = this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => this.loadSnapshot(),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ANTORCHAS
  // ─────────────────────────────────────────────────────────────
  private createTorches(): void {
    this.torch1Gfx = this.createTorch(100, 75);
    this.torch2Gfx = this.createTorch(700, 75);
  }

  private createTorch(x: number, y: number): Phaser.GameObjects.Graphics {
    const gfx = this.add.graphics();
    gfx.setDepth(12);

    // Palo de la antorcha
    gfx.fillStyle(0x6b4c11);
    gfx.fillRect(x - 3, y - 10, 6, 20);

    // Llama (naranja/amarillo)
    gfx.fillStyle(0xff6600, 0.9);
    gfx.fillTriangle(x - 8, y - 10, x, y - 26, x + 8, y - 10);
    gfx.fillStyle(0xffaa00, 0.95);
    gfx.fillTriangle(x - 5, y - 10, x, y - 22, x + 5, y - 10);
    gfx.fillStyle(0xffee44);
    gfx.fillTriangle(x - 2, y - 10, x, y - 16, x + 2, y - 10);

    // Parpadeo de la llama
    this.tweens.add({
      targets: gfx,
      alpha: { from: 0.7, to: 1.0 },
      duration: Phaser.Math.Between(200, 500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Halo de luz
    const halo = this.add.graphics();
    halo.setDepth(3);
    halo.fillStyle(0xff8800, 0.08);
    halo.fillCircle(x, y - 15, 40);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.5, to: 1.0 },
      duration: Phaser.Math.Between(300, 600),
      yoyo: true,
      repeat: -1,
    });

    return gfx;
  }

  // ─────────────────────────────────────────────────────────────
  // OBJETOS DEL ESCENARIO
  // ─────────────────────────────────────────────────────────────
  private createSceneObjects(): void {
    // --- HERRERÍA (esquina inf-izq) ---
    this.forgeArea = new ForgeArea(this);
    this.forgeArea.create();

    // --- MESA DE ESTRATEGIA (centro-derecha) ---
    if (this.textures.exists('strategy-table')) {
      const table = this.add.image(320, 290, 'strategy-table');
      table.setScale(0.1);
      table.setDepth(5);
    } else {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x5c3a1e);
      gfx.fillRect(260, 270, 120, 60);
      gfx.lineStyle(2, 0x8a6230);
      gfx.strokeRect(260, 270, 120, 60);
      gfx.setDepth(5);
      this.add.text(320, 300, 'MESA', {
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#aa8844',
      }).setOrigin(0.5).setDepth(6);
    }

    // --- CABALLETE (derecha, para Sprite) ---
    if (this.textures.exists('easel')) {
      const easel = this.add.image(670, 270, 'easel');
      easel.setScale(0.08);
      easel.setDepth(5);
    } else {
      const gfx = this.add.graphics();
      gfx.lineStyle(3, 0x8a6230);
      gfx.lineBetween(655, 220, 670, 310); // pata izq
      gfx.lineBetween(685, 220, 670, 310); // pata der
      gfx.lineBetween(650, 280, 690, 280); // soporte
      gfx.fillStyle(0xd4b483);
      gfx.fillRect(648, 218, 44, 55);
      gfx.lineStyle(1, 0x6b4020);
      gfx.strokeRect(648, 218, 44, 55);
      gfx.setDepth(5);
      this.add.text(670, 325, 'CABALLETE', {
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#aa8844',
      }).setOrigin(0.5).setDepth(6);
    }

    // --- PERGAMINOS decorativos en pared derecha (detrás del PRMonitor) ---
    const scrollDeco = this.add.graphics();
    scrollDeco.fillStyle(0xd4b483, 0.3);
    scrollDeco.fillRect(585, 100, 170, 220);
    scrollDeco.lineStyle(1, 0x6b4020, 0.5);
    scrollDeco.strokeRect(585, 100, 170, 220);
    scrollDeco.setDepth(4);
  }

  // ─────────────────────────────────────────────────────────────
  // UI ESTÁTICA
  // ─────────────────────────────────────────────────────────────
  private createUI(): void {
    // Título centrado en la parte superior
    this.titleText = this.add.text(400, 18, '🎮 OASIS MISSION CONTROL', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(20);

    // Stats bajo el título
    this.statsText = this.add.text(400, 38, 'Agentes: — | PRs: — | Tareas: —', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#8888bb',
    }).setOrigin(0.5, 0).setDepth(20);

    // Timestamp (esquina inferior derecha)
    this.timestampText = this.add.text(790, 590, '', {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#555577',
    }).setOrigin(1, 1).setDepth(20);
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
      if (!this.snapshot) {
        this.applyFallbackSnapshot();
      }
    }
  }

  private applySnapshot(data: SnapshotData): void {
    this.snapshot = data;

    // Actualizar UI de stats
    this.statsText.setText(
      `Agentes: ${data.stats.agentsActive} | PRs hoy: ${data.stats.prsToday} | Tareas: ${data.stats.tasksCompleted}`
    );
    this.timestampText.setText(new Date(data.timestamp).toLocaleTimeString('es-ES'));

    // Agentes: crear solo los que no existen, actualizar los que sí
    const knownIds = new Set(this.agents.keys());
    const AGENT_KEYS = ['percival', 'forge-alpha', 'sprite'] as const;

    // Filtrar los agentes que queremos mostrar (los que tienen sprites)
    const displayAgents = data.agents.filter(a =>
      AGENT_KEYS.includes(a.id as typeof AGENT_KEYS[number])
    );

    // Si hay un forge-beta pero no forge-alpha, usar forge-beta como forge-alpha
    const forgeAgent = data.agents.find(a => a.id === 'forge-alpha')
      ?? data.agents.find(a => a.id.startsWith('forge'));

    const agentsToDisplay: AgentData[] = [];

    // Percival
    const percival = data.agents.find(a => a.id === 'percival');
    if (percival) agentsToDisplay.push(percival);
    else agentsToDisplay.push({ id: 'percival', name: 'Percival', status: 'idle', currentTask: null, model: 'opus' });

    // Forge
    if (forgeAgent) {
      agentsToDisplay.push({ ...forgeAgent, id: 'forge-alpha' });
    } else {
      agentsToDisplay.push({ id: 'forge-alpha', name: 'Forge', status: 'idle', currentTask: null, model: 'sonnet' });
    }

    // Sprite
    const spriteAgent = data.agents.find(a => a.id === 'sprite');
    if (spriteAgent) agentsToDisplay.push(spriteAgent);
    else agentsToDisplay.push({ id: 'sprite', name: 'Sprite', status: 'idle', currentTask: null, model: 'gemini' });

    agentsToDisplay.forEach(agentData => {
      if (this.agents.has(agentData.id)) {
        // Solo actualizar datos, NO recrear
        this.agents.get(agentData.id)!.update(agentData);
      } else {
        // Crear UNA SOLA VEZ
        const agent = new Agent(this, agentData);
        this.agents.set(agentData.id, agent);
      }
    });

    // Actualizar paneles informativos
    this.taskBoard.create(data.tasks);
    this.prMonitor.create(data.pullRequests);
    this.heartbeat.create(data.heartbeat);
    this.treasureChest.create(data.pullRequests);
  }

  private applyFallbackSnapshot(): void {
    const fallback: SnapshotData = {
      timestamp: new Date().toISOString(),
      heartbeat: { lastCheck: new Date().toISOString(), status: 'warn' },
      agents: [
        { id: 'percival',   name: 'Percival',   status: 'idle', currentTask: null, model: 'opus' },
        { id: 'forge-alpha', name: 'Forge Alpha', status: 'idle', currentTask: null, model: 'sonnet' },
        { id: 'sprite',     name: 'Sprite',     status: 'idle', currentTask: null, model: 'gemini' },
      ],
      tasks: [],
      pullRequests: [],
      stats: { prsToday: 0, tasksCompleted: 0, agentsActive: 0 },
    };
    this.applySnapshot(fallback);
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE (loop de Phaser — mínimo trabajo aquí)
  // ─────────────────────────────────────────────────────────────
  update(): void {
    // Sin lógica en el loop — todo está manejado por tweens y timers
  }
}
