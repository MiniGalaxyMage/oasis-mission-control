import { useRef, useEffect, useState } from 'react';
import './OfficeCanvas.css';
import type { AgentData } from '../../types';

interface OfficeCanvasProps {
  agents: AgentData[];
}

const AGENT_CONFIG: Record<string, { color: string; stationX: number; stationY: number }> = {
  percival: { color: '#9b59b6', stationX: 540, stationY: 300 },
  forge:    { color: '#e74c3c', stationX: 200, stationY: 280 },
  sprite:   { color: '#e91e9e', stationX: 880, stationY: 280 },
};

const DEMO_AGENTS: AgentData[] = [
  { id: 'percival', name: 'Percival', status: 'orchestrating', currentTask: 'Coordinando agentes', model: 'claude-opus-4' },
  { id: 'forge',    name: 'Forge',    status: 'working',       currentTask: 'feat: canvas living room', model: 'claude-sonnet-4' },
  { id: 'sprite',   name: 'Sprite',   status: 'idle',          currentTask: null, model: 'claude-sonnet-4' },
];

const SPRITE_FILES: Record<string, { idle: string; working: string }> = {
  percival: {
    idle:    '/assets/sprites/percival-clean.png',
    working: '/assets/sprites/percival-typing-clean.png',
  },
  forge: {
    idle:    '/assets/sprites/forge-clean.png',
    working: '/assets/sprites/forge-typing-clean.png',
  },
  sprite: {
    idle:    '/assets/sprites/sprite-clean.png',
    working: '/assets/sprites/sprite-typing-clean.png',
  },
};

function processWhiteKey(img: HTMLImageElement): HTMLCanvasElement {
  const offscreen = document.createElement('canvas');
  offscreen.width = img.width;
  offscreen.height = img.height;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 230 && g > 230 && b > 230) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return offscreen;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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
      // grain lines
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
  // pattern lines
  ctx.strokeStyle = '#7b2940';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(rugX + 24, rugY + i * (rugH / 5));
    ctx.lineTo(rugX + rugW - 24, rugY + i * (rugH / 5));
    ctx.stroke();
  }

  // --- Walls ---
  // brick pattern helper
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

  // Top wall
  drawBrickWall(0, 0, W, WALL);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(0, WALL - 4, W, 4);
  ctx.fillStyle = 'rgba(93,80,80,0.6)';
  ctx.fillRect(0, WALL, W, 8);

  // Bottom wall
  drawBrickWall(0, H - WALL, W, WALL);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(0, H - WALL - 4, W, 4);

  // Left wall
  drawBrickWall(0, WALL, WALL, H - WALL * 2);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(WALL - 4, WALL, 4, H - WALL * 2);
  ctx.fillStyle = 'rgba(93,80,80,0.6)';
  ctx.fillRect(WALL, WALL, 8, H - WALL * 2);

  // Right wall
  drawBrickWall(W - WALL, WALL, WALL, H - WALL * 2);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(W - WALL - 4, WALL, 4, H - WALL * 2);

  // --- Door (top center) ---
  const doorX = W / 2 - 48, doorY = 0, doorW = 96, doorH = 64;
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = '#795548';
  ctx.fillRect(doorX + 4, doorY + 4, doorW - 8, doorH - 4);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(doorX + 8, doorY + 8, doorW - 16, doorH - 8);
  ctx.fillStyle = '#4a3f3f';
  ctx.fillRect(doorX, WALL - 4, doorW, 4);
  // handle
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(doorX + doorW - 16, doorH / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // --- Ambient radial light ---
  const grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 500);
  grad.addColorStop(0, 'rgba(255,255,200,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}

// ── Furniture helpers ─────────────────────────────────────────────────────────

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Seat
  ctx.fillStyle = '#7d6e57';
  ctx.fillRect(x - 20, y - 20, 40, 30);
  // Backrest
  ctx.fillStyle = '#6b5c47';
  ctx.fillRect(x - 18, y - 38, 36, 20);
  ctx.fillStyle = '#5a4d3a';
  ctx.fillRect(x - 20, y - 40, 40, 4);
  // Legs
  ctx.fillStyle = '#4a3d2e';
  ctx.fillRect(x - 18, y + 8, 6, 10);
  ctx.fillRect(x + 12, y + 8, 6, 10);
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, agentColor: string) {
  const dw = 96, dh = 64;
  const dx = x - dw / 2, dy = y - dh / 2;
  // Tabletop
  ctx.fillStyle = '#c9a88a';
  ctx.fillRect(dx, dy, dw, dh);
  // Color accent strip
  ctx.fillStyle = agentColor;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(dx, dy, dw, 6);
  ctx.globalAlpha = 1;
  // Outline
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx, dy, dw, dh);
  // Legs
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(dx + 4, dy + dh, 8, 12);
  ctx.fillRect(dx + dw - 12, dy + dh, 8, 12);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, status: AgentData['status']) {
  const screenColor = status === 'working' || status === 'orchestrating' ? '#00cc44'
    : status === 'thinking' ? '#4488ff'
    : status === 'error' ? '#ff4444'
    : '#445566';

  // Stand
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x - 6, y + 18, 12, 10);
  ctx.fillRect(x - 14, y + 26, 28, 4);

  // Frame
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x - 24, y - 22, 48, 40);

  // Screen
  ctx.fillStyle = screenColor;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(x - 20, y - 18, 40, 32);
  ctx.globalAlpha = 1;

  // Code lines on screen
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 4; i++) {
    const lineW = 8 + Math.floor((i * 7) % 20);
    ctx.fillRect(x - 16, y - 14 + i * 8, lineW, 2);
  }

  // Screen reflection
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x - 20, y - 18, 12, 10);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Pot
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(x - 14, y, 28, 22);
  ctx.fillStyle = '#7a4f2e';
  ctx.fillRect(x - 16, y - 4, 32, 6);
  // Soil
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x - 12, y + 2, 24, 8);
  // Leaves
  ctx.fillStyle = '#2d8a2d';
  ctx.beginPath(); ctx.ellipse(x, y - 20, 12, 18, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 14, y - 14, 10, 14, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 14, y - 16, 9, 13, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f6e1f';
  ctx.beginPath(); ctx.ellipse(x - 6, y - 8, 8, 10, 0.2, 0, Math.PI * 2); ctx.fill();
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Body
  ctx.fillStyle = '#888';
  ctx.fillRect(x - 20, y - 36, 40, 50);
  ctx.fillStyle = '#666';
  ctx.fillRect(x - 18, y - 34, 36, 46);
  // Screen
  ctx.fillStyle = '#223';
  ctx.fillRect(x - 12, y - 28, 24, 14);
  ctx.fillStyle = '#00ee88';
  ctx.fillRect(x - 10, y - 26, 20, 10);
  // Nozzle
  ctx.fillStyle = '#444';
  ctx.fillRect(x - 4, y + 10, 8, 6);
  // Mug
  ctx.fillStyle = '#cc3333';
  ctx.fillRect(x - 12, y + 14, 24, 16);
  ctx.fillStyle = '#aa2222';
  ctx.fillRect(x + 10, y + 18, 5, 8);
  // Steam
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  const sw = Math.sin(time * 2) * 3;
  ctx.beginPath(); ctx.moveTo(x - 4, y + 12); ctx.quadraticCurveTo(x - 4 + sw, y + 4, x - 4, y - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 4, y + 12); ctx.quadraticCurveTo(x + 4 - sw, y + 4, x + 4, y - 4); ctx.stroke();
  ctx.restore();
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Frame
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x - 80, y, 160, 90);
  // Surface
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x - 76, y + 4, 152, 78);
  // Scribbles
  const scribbles = [
    { color: '#2244cc', points: [[-60, 20], [-40, 35], [-50, 50]] },
    { color: '#cc2222', points: [[10, 15], [30, 30], [10, 45], [30, 45]] },
    { color: '#228844', points: [[-20, 55], [20, 55]] },
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
  // Marker tray
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - 76, y + 82, 152, 8);
  ctx.fillStyle = '#2244cc';
  ctx.fillRect(x - 70, y + 83, 10, 6);
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(x - 56, y + 83, 10, 6);
  ctx.fillStyle = '#228844';
  ctx.fillRect(x - 42, y + 83, 10, 6);
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Body
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 30, y, 60, 100);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x - 28, y + 4, 56, 92);
  // Units
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x - 26, y + 6 + i * 18, 52, 14);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 26, y + 6 + i * 18, 52, 14);
    // LEDs
    const ledPulse = Math.sin(time * 3 + i * 0.8) > 0.5;
    ctx.fillStyle = ledPulse ? '#00ff44' : '#005522';
    ctx.fillRect(x + 18, y + 10 + i * 18, 5, 5);
    ctx.fillStyle = '#0044ff';
    ctx.fillRect(x + 10, y + 10 + i * 18, 5, 5);
  }
  // Rack handles
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

// ── Main component ────────────────────────────────────────────────────────────

export function OfficeCanvas({ agents }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);

  const [spriteImages, setSpriteImages] = useState<Record<string, { idle: HTMLCanvasElement; working: HTMLCanvasElement }>>({});
  const [roomBg, setRoomBg] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  const activeAgents = agents.length > 0 ? agents : DEMO_AGENTS;

  // Load sprites + build room background
  useEffect(() => {
    let mounted = true;
    const bg = buildRoomBackground();

    const loadSprites = async () => {
      const result: Record<string, { idle: HTMLCanvasElement; working: HTMLCanvasElement }> = {};
      for (const [id, files] of Object.entries(SPRITE_FILES)) {
        try {
          const [idleImg, workImg] = await Promise.all([
            loadImage(files.idle),
            loadImage(files.working),
          ]);
          result[id] = {
            idle: processWhiteKey(idleImg),
            working: processWhiteKey(workImg),
          };
        } catch {
          // sprite not found — skip gracefully
        }
      }
      if (mounted) {
        setSpriteImages(result);
        setRoomBg(bg);
        setReady(true);
      }
    };

    loadSprites();
    return () => { mounted = false; };
  }, []);

  // Sync hover ref so render loop reads latest without re-starting
  useEffect(() => {
    hoveredRef.current = hoveredAgent;
  }, [hoveredAgent]);

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

    const animate = () => {
      timeRef.current += 0.016;
      render(ctx, timeRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeAgents]);

  const render = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.clearRect(0, 0, 1200, 675);

    // 1. Room background
    if (roomBg) ctx.drawImage(roomBg, 0, 0);

    // 2. Props (static)
    drawPlant(ctx, 140, 350);
    drawWhiteboard(ctx, 700, 90);
    drawServerRack(ctx, 1065, 120, time);
    drawCoffeeMachine(ctx, 950, 490, time);

    // 3. Agent workstations + agents
    activeAgents.forEach((agent) => {
      const cfg = AGENT_CONFIG[agent.id];
      if (!cfg) return;
      const { color, stationX: sx, stationY: sy } = cfg;

      // Chair (behind desk)
      drawChair(ctx, sx, sy - 50);
      // Desk
      drawDesk(ctx, sx, sy, color);
      // Monitor
      drawMonitor(ctx, sx, sy - 60, agent.status);

      // Agent sprite
      const sprites = spriteImages[agent.id];
      const useWorking = agent.status === 'working' || agent.status === 'orchestrating';
      const sprite = sprites ? (useWorking ? sprites.working : sprites.idle) : null;

      const bobAmount = useWorking ? 2 : 3;
      const bobSpeed = useWorking ? 3 : 1.5;
      const phaseOffset = agent.id.charCodeAt(0) * 0.7;
      const bobY = agent.status === 'error' ? 0 : Math.sin(time * bobSpeed + phaseOffset) * bobAmount;

      const targetH = 90;
      const scale = sprite ? targetH / sprite.height : 1;
      const sw = sprite ? sprite.width * scale : 48;
      const sh = sprite ? sprite.height * scale : targetH;

      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 100 + sh / 2 + 4, sw / 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Status glow
      const glowPulse = Math.sin(time * 3) * 0.5 + 0.5;
      if (agent.status !== 'idle') {
        ctx.save();
        ctx.globalAlpha = 0.10 + glowPulse * 0.10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy - 100 + sh / 2, sw * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Sprite (or fallback box)
      if (sprite) {
        ctx.save();
        if (agent.status === 'error') {
          ctx.filter = 'grayscale(1)';
        }
        ctx.drawImage(sprite, sx - sw / 2, sy - 100 - sh / 2 + bobY, sw, sh);
        ctx.restore();
      } else {
        // Fallback colored box
        ctx.fillStyle = color;
        ctx.fillRect(sx - 20, sy - 100 - 40 + bobY, 40, 40);
      }

      const spriteTopY = sy - 100 - sh / 2 + bobY;
      const spriteBotY = spriteTopY + sh;

      // Hover highlight
      if (hoveredRef.current === agent.id) {
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(sx - sw / 2 - 4, spriteTopY - 4, sw + 8, sh + 8);
        ctx.restore();
      }

      // Name label
      ctx.save();
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(agent.name, sx, spriteBotY + 6);
      ctx.fillStyle = '#fff';
      ctx.fillText(agent.name, sx, spriteBotY + 6);
      ctx.restore();

      // Status square
      const sqColor = agent.status === 'working' || agent.status === 'orchestrating' ? '#4AFF88'
        : agent.status === 'thinking' ? '#4488ff'
        : agent.status === 'error' ? '#ff4444'
        : '#666';
      ctx.fillStyle = sqColor;
      ctx.fillRect(sx - 6, spriteBotY + 24, 12, 12);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - 6, spriteBotY + 24, 12, 12);

      // Sparkle for working
      if (agent.status === 'working' || agent.status === 'orchestrating') {
        const sp = Math.sin(time * 5 + phaseOffset) * 0.5 + 0.5;
        ctx.save();
        ctx.globalAlpha = sp;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + 30, sy - 80, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // zzZ for idle
      if (agent.status === 'idle') {
        const o1 = Math.sin(time * 2) * 2;
        const o2 = Math.sin(time * 2 + 0.5) * 3;
        const o3 = Math.sin(time * 2 + 1) * 4;
        ctx.save();
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText('z', sx + sw / 2 + 4, spriteTopY + 10 + o1);
        ctx.strokeText('z', sx + sw / 2 + 12, spriteTopY + 2 + o2);
        ctx.strokeText('Z', sx + sw / 2 + 20, spriteTopY - 6 + o3);
        ctx.fillStyle = '#fff';
        ctx.fillText('z', sx + sw / 2 + 4, spriteTopY + 10 + o1);
        ctx.fillText('z', sx + sw / 2 + 12, spriteTopY + 2 + o2);
        ctx.fillText('Z', sx + sw / 2 + 20, spriteTopY - 6 + o3);
        ctx.restore();
      }
    });

    // 4. Speech bubbles on hover (on top of everything)
    activeAgents.forEach((agent) => {
      const cfg = AGENT_CONFIG[agent.id];
      if (!cfg || hoveredRef.current !== agent.id || !agent.currentTask) return;
      const { stationX: sx, stationY: sy } = cfg;
      drawSpeechBubble(ctx, agent.currentTask, sx, sy - 160);
    });
  };

  const drawSpeechBubble = (ctx: CanvasRenderingContext2D, text: string, x: number, tipY: number) => {
    const bw = 260, bh = 70, r = 8, pad = 12;
    const bx = x - bw / 2, by = tipY - bh - 18;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    roundRect(ctx, bx + 3, by + 3, bw, bh, r);
    ctx.fill();
    ctx.restore();

    // Bubble
    ctx.fillStyle = '#FFFEF4';
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.stroke();

    // Tail
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

    // Text
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
      const cfg = AGENT_CONFIG[agent.id];
      if (!cfg) return;
      const { stationX: sx, stationY: sy } = cfg;
      const sprites = spriteImages[agent.id];
      const sh = sprites ? 90 : 40;
      const sw = sprites ? (sprites.idle.width * (90 / sprites.idle.height)) : 40;
      const top = sy - 100 - sh / 2;
      if (mx >= sx - sw / 2 - 6 && mx <= sx + sw / 2 + 6 && my >= top - 6 && my <= top + sh + 6) {
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
