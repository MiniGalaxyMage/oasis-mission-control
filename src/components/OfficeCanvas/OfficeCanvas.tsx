import { useRef, useEffect, useState } from 'react';
import './OfficeCanvas.css';
import type { AgentData } from '../../types';
import { SpriteAnimator } from '../../engine/SpriteAnimator';
import { CollisionMap } from '../../engine/CollisionMap';
import { AgentWalker } from '../../engine/AgentWalker';

interface OfficeCanvasProps {
  agents: AgentData[];
}

const AGENT_CONFIG: Record<string, { color: string; stationX: number; stationY: number; debugColor: string }> = {
  percival: { color: '#9b59b6', stationX: 540, stationY: 300, debugColor: '#9b59b6' },
  forge:    { color: '#e74c3c', stationX: 200, stationY: 280, debugColor: '#e74c3c' },
  sprite:   { color: '#e91e9e', stationX: 880, stationY: 280, debugColor: '#e91e9e' },
};

const AGENT_SPRITES: Record<string, { walk: string; desk: string; cellW: number; cellH: number }> = {
  percival: { walk: '/assets/sprites/percival-walk.png', desk: '/assets/sprites/percival-desk.png', cellW: 128, cellH: 176 },
  forge:    { walk: '/assets/sprites/forge-walk.png',    desk: '/assets/sprites/forge-desk.png',    cellW: 130, cellH: 152 },
  sprite:   { walk: '/assets/sprites/sprite-walk.png',   desk: '/assets/sprites/sprite-desk.png',   cellW: 126, cellH: 120 },
};

const AGENT_WALKER_CONFIG: Record<string, { speed: number; idleTimeMs: number; sitDelay: number; chairKey: string }> = {
  percival: { speed: 120, idleTimeMs: 3000, sitDelay: 3000, chairKey: 'percival_chair' },
  forge:    { speed: 100, idleTimeMs: 2500, sitDelay: 5000, chairKey: 'forge_chair' },
  sprite:   { speed: 140, idleTimeMs: 4000, sitDelay: 7000, chairKey: 'sprite_chair' },
};

const DEMO_AGENTS: AgentData[] = [
  { id: 'percival', name: 'Percival', status: 'orchestrating', currentTask: 'Coordinando agentes', model: 'claude-opus-4' },
  { id: 'forge',    name: 'Forge',    status: 'working',       currentTask: 'feat: canvas living room', model: 'claude-sonnet-4' },
  { id: 'sprite',   name: 'Sprite',   status: 'idle',          currentTask: null, model: 'claude-sonnet-4' },
];

const TARGET_SPRITE_H = 50; // target render height in pixels for all agents

// ── Room drawing (offscreen, cached) ──────────────────────────────────────────

function buildRoomBackground(): HTMLCanvasElement {
  const W = 1200, H = 675;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const WALL = 64;
  const TILE = 32;

  // --- Floor ---
  for (let gy = 0; gy < Math.ceil(H / TILE); gy++) {
    for (let gx = 0; gx < Math.ceil(W / TILE); gx++) {
      const alt = (gx + gy) % 2 === 0;
      ctx.fillStyle = alt ? '#e5c29f' : '#d4a574';
      ctx.fillRect(gx * TILE, gy * TILE, TILE, TILE);
      ctx.strokeStyle = alt ? 'rgba(180,140,100,0.3)' : 'rgba(160,120,80,0.3)';
      ctx.lineWidth = 1;
      for (let g = 1; g <= 2; g++) {
        ctx.beginPath();
        ctx.moveTo(gx * TILE + 2, gy * TILE + g * (TILE / 3));
        ctx.lineTo(gx * TILE + TILE - 2, gy * TILE + g * (TILE / 3));
        ctx.stroke();
      }
    }
  }

  // --- Decorative rug ---
  const rugX = W / 2 - 200, rugY = H / 2 - 100, rugW = 400, rugH = 200;
  ctx.fillStyle = '#6b2737';
  ctx.fillRect(rugX, rugY, rugW, rugH);
  ctx.strokeStyle = '#9b4157';
  ctx.lineWidth = 4;
  ctx.strokeRect(rugX + 8, rugY + 8, rugW - 16, rugH - 16);
  ctx.strokeStyle = '#8b3147';
  ctx.lineWidth = 2;
  ctx.strokeRect(rugX + 16, rugY + 16, rugW - 32, rugH - 32);
  ctx.strokeStyle = '#7b2940';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(rugX + 24, rugY + i * (rugH / 5));
    ctx.lineTo(rugX + rugW - 24, rugY + i * (rugH / 5));
    ctx.stroke();
  }

  // --- Walls ---
  const drawBrickWall = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#6b5d5d';
    ctx.fillRect(x, y, w, h);
    const bw = 64, bh = 32;
    for (let row = 0; row * bh < h; row++) {
      const offsetX = row % 2 === 0 ? 0 : bw / 2;
      for (let col = -1; col * bw < w; col++) {
        const bx = x + col * bw + offsetX;
        const by = y + row * bh;
        const brickW = bw - 2, brickH = bh - 2;
        if (bx + brickW < x || bx > x + w || by + brickH < y || by > y + h) continue;
        ctx.fillStyle = row % 3 === 0 ? '#8b7d7d' : '#7a6c6c';
        ctx.fillRect(bx + 1, by + 1, Math.min(brickW, x + w - bx - 1), Math.min(brickH, y + h - by - 1));
        ctx.strokeStyle = '#4a3f3f';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 1, by + 1, Math.min(brickW, x + w - bx - 1), Math.min(brickH, y + h - by - 1));
      }
    }
  };

  drawBrickWall(0, 0, W, WALL);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(0, WALL - 4, W, 4);
  ctx.fillStyle = 'rgba(93,80,80,0.6)';
  ctx.fillRect(0, WALL, W, 8);

  drawBrickWall(0, H - WALL, W, WALL);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(0, H - WALL - 4, W, 4);

  drawBrickWall(0, WALL, WALL, H - WALL * 2);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(WALL - 4, WALL, 4, H - WALL * 2);
  ctx.fillStyle = 'rgba(93,80,80,0.6)';
  ctx.fillRect(WALL, WALL, 8, H - WALL * 2);

  drawBrickWall(W - WALL, WALL, WALL, H - WALL * 2);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(W - WALL - 4, WALL, 4, H - WALL * 2);

  // --- Door ---
  const doorX = W / 2 - 48, doorY = 0, doorW = 96, doorH = 64;
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = '#795548';
  ctx.fillRect(doorX + 4, doorY + 4, doorW - 8, doorH - 4);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(doorX + 8, doorY + 8, doorW - 16, doorH - 8);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(doorX, WALL - 4, doorW, 4);
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(doorX + doorW - 16, doorH / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // --- Ambient light ---
  const grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 500);
  grad.addColorStop(0, 'rgba(255,255,200,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}

// ── Furniture helpers ─────────────────────────────────────────────────────────

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#7d6e57';
  ctx.fillRect(x - 20, y - 20, 40, 30);
  ctx.fillStyle = '#6b5c47';
  ctx.fillRect(x - 18, y - 38, 36, 20);
  ctx.fillStyle = '#5a4d3a';
  ctx.fillRect(x - 20, y - 40, 40, 4);
  ctx.fillStyle = '#4a3d2e';
  ctx.fillRect(x - 18, y + 8, 6, 10);
  ctx.fillRect(x + 12, y + 8, 6, 10);
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, agentColor: string) {
  const dw = 96, dh = 64;
  const dx = x - dw / 2, dy = y - dh / 2;
  ctx.fillStyle = '#c9a88a';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = agentColor;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(dx, dy, dw, 6);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx, dy, dw, dh);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(dx + 4, dy + dh, 8, 12);
  ctx.fillRect(dx + dw - 12, dy + dh, 8, 12);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, status: AgentData['status']) {
  const screenColor = status === 'working' || status === 'orchestrating' ? '#00cc44'
    : status === 'thinking' ? '#4488ff'
    : status === 'error' ? '#ff4444'
    : '#445566';

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x - 6, y + 18, 12, 10);
  ctx.fillRect(x - 14, y + 26, 28, 4);

  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x - 24, y - 22, 48, 40);

  ctx.fillStyle = screenColor;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(x - 20, y - 18, 40, 32);
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 4; i++) {
    const lineW = 8 + Math.floor((i * 7) % 20);
    ctx.fillRect(x - 16, y - 14 + i * 8, lineW, 2);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x - 20, y - 18, 12, 10);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(x - 14, y, 28, 22);
  ctx.fillStyle = '#7a4f2e';
  ctx.fillRect(x - 16, y - 4, 32, 6);
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x - 12, y + 2, 24, 8);
  ctx.fillStyle = '#2d8a2d';
  ctx.beginPath(); ctx.ellipse(x, y - 20, 12, 18, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 14, y - 14, 10, 14, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 14, y - 16, 9, 13, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f6e1f';
  ctx.beginPath(); ctx.ellipse(x - 6, y - 8, 8, 10, 0.2, 0, Math.PI * 2); ctx.fill();
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.fillStyle = '#888';
  ctx.fillRect(x - 20, y - 36, 40, 50);
  ctx.fillStyle = '#666';
  ctx.fillRect(x - 18, y - 34, 36, 46);
  ctx.fillStyle = '#223';
  ctx.fillRect(x - 12, y - 28, 24, 14);
  ctx.fillStyle = '#00ee88';
  ctx.fillRect(x - 10, y - 26, 20, 10);
  ctx.fillStyle = '#444';
  ctx.fillRect(x - 4, y + 10, 8, 6);
  ctx.fillStyle = '#cc3333';
  ctx.fillRect(x - 12, y + 14, 24, 16);
  ctx.fillStyle = '#aa2222';
  ctx.fillRect(x + 10, y + 18, 5, 8);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  const sw = Math.sin(time * 2) * 3;
  ctx.beginPath(); ctx.moveTo(x - 4, y + 12); ctx.quadraticCurveTo(x - 4 + sw, y + 4, x - 4, y - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 4, y + 12); ctx.quadraticCurveTo(x + 4 - sw, y + 4, x + 4, y - 4); ctx.stroke();
  ctx.restore();
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x - 80, y, 160, 90);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x - 76, y + 4, 152, 78);
  const scribbles = [
    { color: '#2244cc', points: [[-60, 20], [-40, 35], [-50, 50]] as [number,number][] },
    { color: '#cc2222', points: [[10, 15], [30, 30], [10, 45], [30, 45]] as [number,number][] },
    { color: '#228844', points: [[-20, 55], [20, 55]] as [number,number][] },
  ];
  scribbles.forEach(({ color, points }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(x + px, y + py);
      else ctx.lineTo(x + px, y + py);
    });
    ctx.stroke();
  });
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - 76, y + 82, 152, 8);
  ctx.fillStyle = '#2244cc'; ctx.fillRect(x - 70, y + 83, 10, 6);
  ctx.fillStyle = '#cc2222'; ctx.fillRect(x - 56, y + 83, 10, 6);
  ctx.fillStyle = '#228844'; ctx.fillRect(x - 42, y + 83, 10, 6);
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 30, y, 60, 100);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x - 28, y + 4, 56, 92);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x - 26, y + 6 + i * 18, 52, 14);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 26, y + 6 + i * 18, 52, 14);
    const ledPulse = Math.sin(time * 3 + i * 0.8) > 0.5;
    ctx.fillStyle = ledPulse ? '#00ff44' : '#005522';
    ctx.fillRect(x + 18, y + 10 + i * 18, 5, 5);
    ctx.fillStyle = '#0044ff';
    ctx.fillRect(x + 10, y + 10 + i * 18, 5, 5);
  }
  ctx.fillStyle = '#444';
  ctx.fillRect(x - 30, y, 4, 100);
  ctx.fillRect(x + 26, y, 4, 100);
}

// ── Round-rect helper ─────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Walker state per agent ────────────────────────────────────────────────────

interface AgentWalkState {
  walker: AgentWalker;
  walkAnim: SpriteAnimator;
  deskAnim: SpriteAnimator;
  sitting: boolean;
  sitTimer: number; // ms remaining before standing up
  elapsed: number;  // ms since load (for anim frames)
  chairX: number;
  chairY: number;
  scale: number;
  spriteW: number;
  spriteH: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export function OfficeCanvas({ agents }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);

  const walkersRef = useRef<Map<string, AgentWalkState>>(new Map());
  const collisionMapRef = useRef<CollisionMap | null>(null);

  const [roomBg, setRoomBg] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  const debugOverlayRef = useRef(false);
  const lastFrameTimeRef = useRef<number | null>(null);
  const fpsRef = useRef(0);

  const activeAgents = agents.length > 0 ? agents : DEMO_AGENTS;

  // Initialize walk system for all agents
  useEffect(() => {
    let mounted = true;
    const bg = buildRoomBackground();

    const init = async () => {
      try {
        const posRes = await fetch('/assets/room/positions.json');
        const posData = await posRes.json();
        const rawMatrix: string[] = posData.matrix;

        const CANVAS_W = 1200, CANVAS_H = 675;
        const collisionMap = new CollisionMap(rawMatrix, CANVAS_W, CANVAS_H);
        collisionMapRef.current = collisionMap;

        const walkerMap = new Map<string, AgentWalkState>();

        for (const agentId of ['percival', 'forge', 'sprite']) {
          const sprCfg = AGENT_SPRITES[agentId];
          const wlkCfg = AGENT_WALKER_CONFIG[agentId];

          const chairPos = posData[wlkCfg.chairKey] ?? { x: 504, y: 408 };
          const startTile = collisionMap.pixelToTile(chairPos.x, chairPos.y);

          const walker = new AgentWalker(collisionMap, {
            startTileX: startTile.tx,
            startTileY: startTile.ty,
            speed: wlkCfg.speed,
            idleTimeMs: wlkCfg.idleTimeMs,
          });

          const walkAnim = new SpriteAnimator({
            imageSrc: sprCfg.walk,
            cellWidth: sprCfg.cellW,
            cellHeight: sprCfg.cellH,
            columns: 4,
            fps: 8,
          });
          await walkAnim.load();

          const deskAnim = new SpriteAnimator({
            imageSrc: sprCfg.desk,
            cellWidth: sprCfg.cellW,
            cellHeight: sprCfg.cellH,
            columns: 4,
            fps: 6,
          });
          await deskAnim.load();

          const scale = TARGET_SPRITE_H / sprCfg.cellH;
          const spriteW = sprCfg.cellW * scale;
          const spriteH = TARGET_SPRITE_H;

          walkerMap.set(agentId, {
            walker,
            walkAnim,
            deskAnim,
            sitting: true,
            sitTimer: wlkCfg.sitDelay,
            elapsed: 0,
            chairX: chairPos.x,
            chairY: chairPos.y,
            scale,
            spriteW,
            spriteH,
          });
        }

        if (mounted) {
          walkersRef.current = walkerMap;
          setRoomBg(bg);
          setReady(true);
        }
      } catch (e) {
        console.warn('Walk system init failed:', e);
        if (mounted) {
          setRoomBg(bg);
          setReady(true);
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // Sync hover ref
  useEffect(() => {
    hoveredRef.current = hoveredAgent;
  }, [hoveredAgent]);

  // Debug overlay toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        debugOverlayRef.current = !debugOverlayRef.current;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 675;
    ctx.imageSmoothingEnabled = false;

    const animate = (timestamp: number) => {
      const dt = lastFrameTimeRef.current !== null
        ? Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.1)
        : 0.016;
      lastFrameTimeRef.current = timestamp;
      fpsRef.current = dt > 0 ? Math.round(1 / dt) : 60;

      timeRef.current += dt;
      const dtMs = dt * 1000;

      // Update all walkers
      walkersRef.current.forEach((state) => {
        state.elapsed += dtMs;
        if (state.sitting) {
          state.sitTimer -= dtMs;
          if (state.sitTimer <= 0) {
            state.sitting = false;
          }
        } else {
          state.walker.update(dt);
        }
      });

      render(ctx, timeRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeAgents]);

  const render = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.clearRect(0, 0, 1200, 675);

    // 1. Room background
    if (roomBg) ctx.drawImage(roomBg, 0, 0);

    // 2. Props
    drawPlant(ctx, 140, 350);
    drawWhiteboard(ctx, 700, 90);
    drawServerRack(ctx, 1065, 120, time);
    drawCoffeeMachine(ctx, 950, 490, time);

    // 3. Workstations + agents
    activeAgents.forEach((agent) => {
      const cfg = AGENT_CONFIG[agent.id];
      if (!cfg) return;
      const { color, stationX: sx, stationY: sy } = cfg;

      drawChair(ctx, sx, sy - 50);
      drawDesk(ctx, sx, sy, color);
      drawMonitor(ctx, sx, sy - 60, agent.status);

      const state = walkersRef.current.get(agent.id);
      if (!state) return;

      const { walker, walkAnim, deskAnim, sitting, elapsed, spriteW, spriteH, scale, chairX, chairY } = state;

      // Draw position: sitting = chair, walking = walker
      const drawX = sitting ? chairX : walker.x;
      const drawY = sitting ? chairY : walker.y;

      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(drawX, drawY + 4, spriteW / 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw sprite
      if (sitting && deskAnim?.isLoaded) {
        const frame = deskAnim.getCurrentFrame(elapsed);
        deskAnim.drawFrame(ctx, 0, frame, drawX - spriteW / 2, drawY - spriteH, scale);
      } else if (walker.isMoving) {
        const dirRow = walker.direction === 'down' ? 0
          : walker.direction === 'left' ? 1
          : walker.direction === 'right' ? 2 : 3;
        const frame = walkAnim.getCurrentFrame(elapsed);
        walkAnim.drawFrame(ctx, dirRow, frame, drawX - spriteW / 2, drawY - spriteH, scale);
      } else {
        const dirRow = walker.direction === 'down' ? 0
          : walker.direction === 'left' ? 1
          : walker.direction === 'right' ? 2 : 3;
        walkAnim.drawFrame(ctx, dirRow, 0, drawX - spriteW / 2, drawY - spriteH, scale);
      }

      const spriteTopY = drawY - spriteH;
      const spriteBotY = drawY;

      // Hover highlight
      if (hoveredRef.current === agent.id) {
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(drawX - spriteW / 2 - 4, spriteTopY - 4, spriteW + 8, spriteH + 8);
        ctx.restore();
      }

      // Name label
      ctx.save();
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(agent.name, drawX, spriteBotY + 6);
      ctx.fillStyle = '#fff';
      ctx.fillText(agent.name, drawX, spriteBotY + 6);
      ctx.restore();

      // Status indicator
      const sqColor = agent.status === 'working' || agent.status === 'orchestrating' ? '#4AFF88'
        : agent.status === 'thinking' ? '#4488ff'
        : agent.status === 'error' ? '#ff4444' : '#666';
      ctx.fillStyle = sqColor;
      ctx.fillRect(drawX - 6, spriteBotY + 24, 12, 12);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 6, spriteBotY + 24, 12, 12);
    });

    // 4. Debug overlay
    if (debugOverlayRef.current && collisionMapRef.current) {
      const cm = collisionMapRef.current;
      for (let ty = 0; ty < cm.rows; ty++) {
        for (let tx = 0; tx < cm.cols; tx++) {
          const walkable = cm.canWalk(tx, ty);
          const px = tx * cm.tileWidth;
          const py = ty * cm.tileHeight;
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = walkable ? '#00ff00' : '#ff0000';
          ctx.fillRect(px, py, cm.tileWidth, cm.tileHeight);
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cm.tileWidth, cm.tileHeight);
          ctx.restore();
        }
      }

      // Agent dots + destination lines
      walkersRef.current.forEach((state, agentId) => {
        const cfg = AGENT_CONFIG[agentId];
        if (!cfg) return;
        const w = state.walker;
        const drawX = state.sitting ? state.chairX : w.x;
        const drawY = state.sitting ? state.chairY : w.y;

        ctx.save();
        ctx.fillStyle = cfg.debugColor;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (!state.sitting) {
          const dest = cm.tileToPixel(w.destTile.tx, w.destTile.ty);
          ctx.strokeStyle = cfg.debugColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(drawX, drawY);
          ctx.lineTo(dest.px, dest.py);
          ctx.stroke();
        }
        ctx.restore();
      });

      // FPS
      ctx.save();
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`FPS: ${fpsRef.current}`, 10, 20);
      ctx.restore();
    }

    // 5. Speech bubbles on hover
    activeAgents.forEach((agent) => {
      const cfg = AGENT_CONFIG[agent.id];
      if (!cfg || hoveredRef.current !== agent.id || !agent.currentTask) return;

      const state = walkersRef.current.get(agent.id);
      let bx = cfg.stationX;
      let by = cfg.stationY - 160;

      if (state && !state.sitting) {
        bx = state.walker.x;
        by = state.walker.y - 80;
      }

      drawSpeechBubble(ctx, agent.currentTask, bx, by);
    });
  };

  const drawSpeechBubble = (ctx: CanvasRenderingContext2D, text: string, x: number, tipY: number) => {
    const bw = 260, bh = 70, r = 8, pad = 12;
    const bx = x - bw / 2, by = tipY - bh - 18;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    roundRect(ctx, bx + 3, by + 3, bw, bh, r);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#FFFEF4';
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 10, by + bh);
    ctx.lineTo(x + 10, by + bh);
    ctx.lineTo(x, by + bh + 16);
    ctx.closePath();
    ctx.fillStyle = '#FFFEF4';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '13px monospace';
    ctx.fillStyle = '#2A2A2A';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    words.forEach((w) => {
      const test = current + w + ' ';
      if (ctx.measureText(test).width > bw - pad * 2 && current) {
        lines.push(current.trim());
        current = w + ' ';
      } else {
        current = test;
      }
    });
    if (current) lines.push(current.trim());
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, bx + pad, by + pad + i * 18);
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 1200;
    const my = ((e.clientY - rect.top) / rect.height) * 675;

    let found: string | null = null;
    activeAgents.forEach((agent) => {
      const state = walkersRef.current.get(agent.id);
      if (!state) return;

      const drawX = state.sitting ? state.chairX : state.walker.x;
      const drawY = state.sitting ? state.chairY : state.walker.y;
      const { spriteW, spriteH } = state;
      const top = drawY - spriteH;

      if (mx >= drawX - spriteW / 2 - 6 && mx <= drawX + spriteW / 2 + 6 && my >= top - 6 && my <= drawY + 6) {
        found = agent.id;
      }
    });
    setHoveredAgent(found);
  };

  if (!ready) {
    return (
      <div className="office-canvas-wrapper">
        <div style={{ color: '#FFD700', fontFamily: 'monospace', fontSize: '16px' }}>
          Iniciando oficina...
        </div>
      </div>
    );
  }

  return (
    <div className="office-canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={1200}
        height={675}
        onMouseMove={handleMouseMove}
        style={{
          imageRendering: 'pixelated',
          border: '4px solid #2A2A2A',
          maxWidth: '100%',
          height: 'auto',
          cursor: hoveredAgent ? 'pointer' : 'default',
        } as React.CSSProperties}
      />
    </div>
  );
}
