import { useRef, useEffect, useState, useCallback } from 'react';
import { AgentStatusProvider, type AgentStatus as GwAgentStatus } from '../lib/gateway';
import { ROOMS } from '../lib/rooms';

// ─── Agent types ───────────────────────────────────────────────
type AgentStatus = 'working' | 'idle' | 'sleeping';

interface Agent {
  id: string;
  name: string;
  color: string;
  status: AgentStatus;
  currentTask: string;
  position: { x: number; y: number };
}

// ─── Config ────────────────────────────────────────────────────
const CANVAS_W = 1200;
const CANVAS_H = 675;

const AGENT_COLORS: Record<string, string> = {
  percival: '#9B59B6',
  forge: '#DC143C',
  sprite: '#FF69B4',
};

function gwToAgents(gwAgents: GwAgentStatus[], roomId: string): Agent[] {
  const room = ROOMS.find((r) => r.id === roomId);
  return gwAgents.map((a) => ({
    id: a.id,
    name: a.name,
    color: AGENT_COLORS[a.id] ?? '#888',
    status: a.status,
    currentTask: a.currentTask,
    position: room?.agentPositions[a.id] ?? { x: 600, y: 400 },
  }));
}

function makeDefaultAgents(roomId: string): Agent[] {
  const room = ROOMS.find((r) => r.id === roomId);
  return [
    {
      id: 'forge', name: 'Forge', color: '#DC143C', status: 'sleeping',
      currentTask: 'Connecting to gateway...',
      position: room?.agentPositions['forge'] ?? { x: 270, y: 420 },
    },
    {
      id: 'percival', name: 'Percival', color: '#9B59B6', status: 'sleeping',
      currentTask: 'Connecting to gateway...',
      position: room?.agentPositions['percival'] ?? { x: 600, y: 370 },
    },
    {
      id: 'sprite', name: 'Sprite', color: '#FF69B4', status: 'sleeping',
      currentTask: 'Connecting to gateway...',
      position: room?.agentPositions['sprite'] ?? { x: 940, y: 460 },
    },
  ];
}

const SPRITE_FILES: Record<string, string> = {
  forge: '/assets/sprites/forge-idle.png',
  percival: '/assets/sprites/percival-idle.png',
  sprite: '/assets/sprites/sprite-idle.png',
};

// ─── Component ─────────────────────────────────────────────────
interface OfficeCanvasProps {
  roomId: string;
}

export function OfficeCanvas({ roomId }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Live agent data from gateway
  const [agents, setAgents] = useState<Agent[]>(() => makeDefaultAgents(roomId));
  const agentsRef = useRef<Agent[]>(makeDefaultAgents(roomId));

  const handleGatewayUpdate = useCallback((gwAgents: GwAgentStatus[]) => {
    const updated = gwToAgents(gwAgents, roomId);
    agentsRef.current = updated;
    setAgents(updated);
  }, [roomId]);

  // Poll agent status
  useEffect(() => {
    const provider = new AgentStatusProvider({
      onUpdate: handleGatewayUpdate,
    });
    provider.start();
    return () => provider.stop();
  }, [handleGatewayUpdate]);

  // Update agent positions when room changes
  useEffect(() => {
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) return;
    agentsRef.current = agentsRef.current.map((a) => ({
      ...a,
      position: room.agentPositions[a.id] ?? a.position,
    }));
    setAgents((prev) =>
      prev.map((a) => ({
        ...a,
        position: room.agentPositions[a.id] ?? a.position,
      }))
    );
  }, [roomId]);

  // Loaded assets
  const bgRef = useRef<Record<string, HTMLImageElement>>({});
  const spritesRef = useRef<Record<string, HTMLCanvasElement>>({});
  const [ready, setReady] = useState(false);

  // ── Load assets ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function load() {
      // Pre-load all room backgrounds
      const loadedBgs: Record<string, HTMLImageElement> = {};
      for (const room of ROOMS) {
        try {
          const bg = new Image();
          bg.src = room.background;
          await new Promise<void>((res, rej) => {
            bg.onload = () => res();
            bg.onerror = rej;
          });
          loadedBgs[room.id] = bg;
        } catch {
          // skip if background not found
        }
      }

      // Sprites (use first frame from walk spritesheet)
      const processed: Record<string, HTMLCanvasElement> = {};
      for (const [id, path] of Object.entries(SPRITE_FILES)) {
        try {
          const img = new Image();
          img.src = path;
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
          });
          // Use image directly (already a single idle sprite)
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const c = canvas.getContext('2d')!;
          c.drawImage(img, 0, 0);
          processed[id] = canvas;
        } catch {
          // If sprite not found, we'll draw a placeholder
        }
      }

      if (mounted) {
        bgRef.current = loadedBgs;
        spritesRef.current = processed;
        setReady(true);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Extract first frame from walk spritesheet (4 cols grid)
  function extractFirstFrame(img: HTMLImageElement, _id: string): HTMLCanvasElement {
    const cols = 4;
    const frameW = img.width / cols;
    const frameH = img.height / cols; // 4 rows (down, left, right, up)
    const canvas = document.createElement('canvas');
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d')!;
    // First frame = row 0, col 0 (facing down)
    ctx.drawImage(img, 0, 0, frameW, frameH, 0, 0, frameW, frameH);
    return canvas;
  }

  // ── Animation loop ───────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    function animate() {
      timeRef.current += 0.016;
      render(ctx, timeRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [ready, hoveredAgent, agents, roomId]);

  // ── Render ───────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, time: number) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Background
    const bg = bgRef.current[roomId];
    if (bg) {
      ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
    }

    // 2. Agents
    for (const agent of agentsRef.current) {
      drawAgent(ctx, agent, time);
    }

    // 3. Speech bubbles (on top)
    for (const agent of agentsRef.current) {
      if (agent.status === 'working' || hoveredAgent === agent.id) {
        drawSpeechBubble(ctx, agent);
      }
    }
  }

  function drawAgent(ctx: CanvasRenderingContext2D, agent: Agent, time: number) {
    const { x, y } = agent.position;
    const sprite = spritesRef.current[agent.id];

    // Subtle breathing animation (no floating/bouncing)
    const phase = agent.id.charCodeAt(0) * 0.7;
    const breathSpeed = agent.status === 'working' ? 2 : 1;
    const breathAmount = agent.status === 'working' ? 1 : 0.5;
    const bobY = Math.sin(time * breathSpeed + phase) * breathAmount;

    // Target sprite height on canvas
    const targetH = 95;

    if (sprite) {
      const scale = targetH / sprite.height;
      const w = sprite.width * scale;
      const h = targetH;

      // Ground shadow (warm-tinted, anchored at feet)
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#1a0a00';
      ctx.beginPath();
      ctx.ellipse(x, y + 4, w / 2.2, h / 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sprite anchored at feet (y = bottom of sprite)
      const spriteX = x - w / 2;
      const spriteY = y - h + bobY;

      ctx.save();
      if (agent.status === 'sleeping') {
        ctx.globalAlpha = 0.5;
        ctx.filter = 'grayscale(0.4) brightness(0.7) sepia(0.3)';
      } else {
        ctx.filter = 'sepia(0.08) brightness(1.02)';
      }
      ctx.drawImage(sprite, spriteX, spriteY, w, h);
      ctx.restore();

      // Warm candlelight rim (subtle orange glow)
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = '#ff9944';
      ctx.fillRect(spriteX, spriteY, w, h);
      ctx.restore();
    } else {
      // Placeholder circle
      ctx.save();
      ctx.fillStyle = agent.color;
      ctx.globalAlpha = agent.status === 'sleeping' ? 0.5 : 1;
      ctx.beginPath();
      ctx.arc(x, y + bobY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Sleep indicator
    if (agent.status === 'sleeping') {
      drawSleep(ctx, x, y - targetH + bobY, time);
    }

    // Active indicator (pulsing dot)
    if (agent.status === 'working') {
      const pulse = Math.sin(time * 4);
      ctx.save();
      ctx.fillStyle = '#4AFF88';
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.beginPath();
      ctx.arc(x + 25, y - targetH + bobY + 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Name label (below feet)
    ctx.save();
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(agent.name, x, y + 10);
    ctx.fillStyle = agent.color;
    ctx.fillText(agent.name, x, y + 10);
    ctx.restore();

    // Hover highlight
    if (hoveredAgent === agent.id) {
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      const hw = targetH * 0.7;
      ctx.strokeRect(x - hw / 2 - 4, y - targetH + bobY - 4, hw + 8, targetH + 8);
      ctx.restore();
    }
  }

  function drawSleep(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    const offsets = [
      Math.sin(time * 2) * 2,
      Math.sin(time * 2 + 0.5) * 3,
      Math.sin(time * 2 + 1) * 4,
    ];
    ctx.save();
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#fff';
    ['z', 'z', 'Z'].forEach((ch, i) => {
      const tx = x + 20 + i * 10;
      const ty = y - 10 - i * 8 + offsets[i];
      ctx.strokeText(ch, tx, ty);
      ctx.fillText(ch, tx, ty);
    });
    ctx.restore();
  }

  function drawSpeechBubble(ctx: CanvasRenderingContext2D, agent: Agent) {
    if (!agent.currentTask) return;
    const { x, y } = agent.position;

    const bubbleW = 240;
    const bubbleH = 50;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - 95 - 50; // above the sprite head
    const radius = 8;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#1a0a00';
    roundRect(ctx, bubbleX + 3, bubbleY + 3, bubbleW, bubbleH, radius);
    ctx.fill();
    ctx.restore();

    // Background (parchment tone)
    ctx.fillStyle = '#f0dfc0';
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius);
    ctx.fill();

    // Border (warm brown instead of black)
    ctx.strokeStyle = '#6b4c2a';
    ctx.lineWidth = 2;
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius);
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x - 8, bubbleY + bubbleH);
    ctx.lineTo(x + 8, bubbleY + bubbleH);
    ctx.lineTo(x, bubbleY + bubbleH + 12);
    ctx.closePath();
    ctx.fillStyle = '#f0dfc0';
    ctx.fill();
    ctx.strokeStyle = '#6b4c2a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text (warm dark brown)
    ctx.font = '11px monospace';
    ctx.fillStyle = '#3a2a1a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxWidth = bubbleW - 20;
    const words = agent.currentTask.split(' ');
    let line = '';
    let lineY = bubbleY + 10;
    const lineH = 15;

    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), bubbleX + 10, lineY);
        line = word + ' ';
        lineY += lineH;
        if (lineY > bubbleY + bubbleH - 10) break;
      } else {
        line = test;
      }
    }
    if (line && lineY <= bubbleY + bubbleH - 10) {
      ctx.fillText(line.trim(), bubbleX + 10, lineY);
    }
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number,
  ) {
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

  // ── Mouse interaction ────────────────────────────────────────
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const my = ((e.clientY - rect.top) / rect.height) * CANVAS_H;

    let hit: string | null = null;
    for (const agent of agentsRef.current) {
      const dx = mx - agent.position.x;
      const dy = my - agent.position.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 40) {
        hit = agent.id;
        break;
      }
    }
    setHoveredAgent(hit);
  }

  // ── Loading state ────────────────────────────────────────────
  if (!ready) {
    return (
      <div
        style={{
          width: `${CANVAS_W}px`,
          height: `${CANVAS_H}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2a',
          border: '4px solid #2A2A2A',
          color: '#FFD700',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '14px',
        }}
      >
        Loading Command Center...
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredAgent(null)}
      style={{
        imageRendering: 'pixelated',
        cursor: hoveredAgent ? 'pointer' : 'default',
        border: '4px solid #2A2A2A',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        background: '#000',
        maxWidth: '100%',
        height: 'auto',
      } as React.CSSProperties}
    />
  );
}
