import { useRef, useEffect, useState, useCallback } from 'react';
import { AgentStatusProvider, type AgentStatus as GwAgentStatus } from '../lib/gateway';
import { ROOMS } from '../lib/rooms';
import { createWalkerState, updateWalker, type WalkerState } from '../lib/agent-walker';
import { DialogBox } from './DialogBox';
import { audioManager } from '../lib/audio';

// ─── Agent types ───────────────────────────────────────────────
type AgentStatus = 'working' | 'idle' | 'sleeping';

interface Agent {
  id: string;
  name: string;
  color: string;
  status: AgentStatus;
  currentTask: string;
  lastSeen?: number;
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
    lastSeen: a.lastSeen,
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

// ─── Transition state ──────────────────────────────────────────
type TransitionPhase = 'none' | 'fade-out' | 'fade-in';

// ─── Component ─────────────────────────────────────────────────
interface OfficeCanvasProps {
  roomId: string;
}

export function OfficeCanvas({ roomId }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => audioManager.muted);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Para detectar cambios de estado de agentes (wake/complete sounds)
  const prevAgentStatusRef = useRef<Record<string, string>>({});
  // Música sólo empieza al primer click del usuario (browser autoplay policy)
  const musicStartedRef = useRef(false);

  // Live agent data from gateway
  const [agents, setAgents] = useState<Agent[]>(() => makeDefaultAgents(roomId));
  const agentsRef = useRef<Agent[]>(makeDefaultAgents(roomId));

  // Walker states keyed by agent id
  const walkersRef = useRef<Record<string, WalkerState>>({});

  // Active room (with transition buffering)
  const activeRoomRef = useRef(roomId);
  const transitionPhaseRef = useRef<TransitionPhase>('none');
  const transitionAlphaRef = useRef(0);
  const pendingRoomRef = useRef<string | null>(null);

  // Transition block flag
  const transitioningRef = useRef(false);

  const handleGatewayUpdate = useCallback((gwAgents: GwAgentStatus[]) => {
    const updated = gwToAgents(gwAgents, activeRoomRef.current);

    // Detectar cambios de estado para sonidos de agente
    for (const agent of updated) {
      const prev = prevAgentStatusRef.current[agent.id];
      const curr = agent.status;
      if (prev !== undefined && prev !== curr) {
        // sleeping → working/idle: agente despierta
        if (prev === 'sleeping' && (curr === 'working' || curr === 'idle')) {
          audioManager.play('agent-wake');
        }
        // working → sleeping: tarea completada
        if (prev === 'working' && curr === 'sleeping') {
          audioManager.play('task-complete');
        }
      }
      // task con ✅: completado
      if (prev !== undefined && agent.currentTask.includes('✅') &&
          !(agentsRef.current.find(a => a.id === agent.id)?.currentTask ?? '').includes('✅')) {
        audioManager.play('task-complete');
      }
      prevAgentStatusRef.current[agent.id] = curr;
    }

    agentsRef.current = updated;
    setAgents(updated);
  }, []);

  // Poll agent status
  useEffect(() => {
    const provider = new AgentStatusProvider({
      onUpdate: handleGatewayUpdate,
    });
    provider.start();
    return () => provider.stop();
  }, [handleGatewayUpdate]);

  // Música ambiental — inicia al primer click (browser autoplay policy)
  useEffect(() => {
    return () => {
      audioManager.stopMusic();
    };
  }, []);

  // ── Room transition on roomId prop change ────────────────────
  useEffect(() => {
    if (roomId === activeRoomRef.current) return;
    if (transitioningRef.current) {
      pendingRoomRef.current = roomId;
      return;
    }
    startTransition(roomId);
  }, [roomId]);

  function startTransition(targetRoom: string) {
    audioManager.play('room-transition');
    transitioningRef.current = true;
    transitionPhaseRef.current = 'fade-out';
    transitionAlphaRef.current = 0;

    // Animate fade-out over 300ms then swap room
    const fadeOutDuration = 300;
    const start = performance.now();

    function fadeOut() {
      const elapsed = performance.now() - start;
      transitionAlphaRef.current = Math.min(elapsed / fadeOutDuration, 1);
      if (elapsed < fadeOutDuration) {
        requestAnimationFrame(fadeOut);
      } else {
        // Swap room
        activeRoomRef.current = targetRoom;
        const room = ROOMS.find((r) => r.id === targetRoom);
        if (room) {
          // Reset agent positions to new room's home
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
          // Reset walkers to new home positions
          walkersRef.current = {};
        }
        setSelectedAgent(null);
        transitionPhaseRef.current = 'fade-in';
        const fadeInStart = performance.now();
        function fadeIn() {
          const el = performance.now() - fadeInStart;
          transitionAlphaRef.current = 1 - Math.min(el / fadeOutDuration, 1);
          if (el < fadeOutDuration) {
            requestAnimationFrame(fadeIn);
          } else {
            transitionAlphaRef.current = 0;
            transitionPhaseRef.current = 'none';
            transitioningRef.current = false;
            // Check if there's a queued room change
            if (pendingRoomRef.current && pendingRoomRef.current !== activeRoomRef.current) {
              const next = pendingRoomRef.current;
              pendingRoomRef.current = null;
              startTransition(next);
            }
          }
        }
        requestAnimationFrame(fadeIn);
      }
    }
    requestAnimationFrame(fadeOut);
  }

  // Loaded assets
  const bgRef = useRef<Record<string, HTMLImageElement>>({});
  const spritesRef = useRef<Record<string, HTMLCanvasElement>>({});
  const [ready, setReady] = useState(false);

  // ── Load assets ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function load() {
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

      const processed: Record<string, HTMLCanvasElement> = {};
      for (const [id, path] of Object.entries(SPRITE_FILES)) {
        try {
          const img = new Image();
          img.src = path;
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const c = canvas.getContext('2d')!;
          c.drawImage(img, 0, 0);
          processed[id] = canvas;
        } catch {
          // placeholder
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

  // ── Walker init & update ─────────────────────────────────────
  // Initialise walker for any agent that doesn't have one yet
  function ensureWalkers() {
    const room = ROOMS.find((r) => r.id === activeRoomRef.current);
    for (const agent of agentsRef.current) {
      if (!walkersRef.current[agent.id]) {
        const homePos = room?.agentPositions[agent.id] ?? agent.position;
        walkersRef.current[agent.id] = createWalkerState(homePos);
      }
    }
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

      // Update walkers
      ensureWalkers();
      const room = ROOMS.find((r) => r.id === activeRoomRef.current);
      const area = room?.walkableArea ?? { minX: 50, maxX: 1150, minY: 350, maxY: 550 };

      for (const agent of agentsRef.current) {
        const walker = walkersRef.current[agent.id];
        if (walker) {
          walkersRef.current[agent.id] = updateWalker(walker, agent.status, area);
        }
      }

      render(ctx, timeRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hoveredAgent, agents, selectedAgent]);

  // ── Render ───────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, time: number) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const currentRoom = activeRoomRef.current;

    // 1. Background
    const bg = bgRef.current[currentRoom];
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

    // 4. Transition overlay (fade to/from black)
    const alpha = transitionAlphaRef.current;
    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
  }

  function getWalkerPos(agent: Agent): { x: number; y: number } {
    const walker = walkersRef.current[agent.id];
    return walker ? walker.currentPos : agent.position;
  }

  function isFacingLeft(agent: Agent): boolean {
    const walker = walkersRef.current[agent.id];
    return walker ? walker.facingLeft : false;
  }

  function drawAgent(ctx: CanvasRenderingContext2D, agent: Agent, time: number) {
    const { x, y } = getWalkerPos(agent);
    const facingLeft = isFacingLeft(agent);
    const sprite = spritesRef.current[agent.id];

    const phase = agent.id.charCodeAt(0) * 0.7;
    const breathSpeed = agent.status === 'working' ? 2 : 1;
    const breathAmount = agent.status === 'working' ? 1 : 0.5;
    const bobY = Math.sin(time * breathSpeed + phase) * breathAmount;

    const targetH = 95;

    if (sprite) {
      const scale = targetH / sprite.height;
      const w = sprite.width * scale;
      const h = targetH;

      // Ground shadow
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#1a0a00';
      ctx.beginPath();
      ctx.ellipse(x, y + 4, w / 2.2, h / 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const spriteX = x - w / 2;
      const spriteY = y - h + bobY;

      ctx.save();
      if (agent.status === 'sleeping') {
        ctx.globalAlpha = 0.5;
        ctx.filter = 'grayscale(0.4) brightness(0.7) sepia(0.3)';
      } else {
        ctx.filter = 'sepia(0.08) brightness(1.02)';
      }

      // Horizontal flip when facing left
      if (facingLeft) {
        ctx.translate(x, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -w / 2, spriteY, w, h);
      } else {
        ctx.drawImage(sprite, spriteX, spriteY, w, h);
      }
      ctx.restore();

      // Warm candlelight rim
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = '#ff9944';
      ctx.fillRect(spriteX, spriteY, w, h);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = agent.color;
      ctx.globalAlpha = agent.status === 'sleeping' ? 0.5 : 1;
      ctx.beginPath();
      ctx.arc(x, y + bobY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (agent.status === 'sleeping') {
      drawSleep(ctx, x, y - targetH + bobY, time);
    }

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

    // Name label
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
      const spriteTop = y - targetH + bobY;
      ctx.strokeRect(x - hw / 2 - 4, spriteTop - 4, hw + 8, targetH + 8);
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
    const { x, y } = getWalkerPos(agent);

    const bubbleW = 240;
    const bubbleH = 50;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - 95 - 50;
    const radius = 8;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#1a0a00';
    roundRect(ctx, bubbleX + 3, bubbleY + 3, bubbleW, bubbleH, radius);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f0dfc0';
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius);
    ctx.fill();

    ctx.strokeStyle = '#6b4c2a';
    ctx.lineWidth = 2;
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius);
    ctx.stroke();

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
  function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>): { mx: number; my: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      mx: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      my: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function hitTestAgent(mx: number, my: number): string | null {
    for (const agent of agentsRef.current) {
      const { x, y } = getWalkerPos(agent);
      const dx = mx - x;
      const dy = my - y;
      if (Math.abs(dx) < 35 && Math.abs(dy) < 60) {
        return agent.id;
      }
    }
    return null;
  }

  const prevHoveredRef = useRef<string | null>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (transitioningRef.current) return;
    const { mx, my } = getCanvasCoords(e);
    const hit = hitTestAgent(mx, my);
    // Sonido solo al entrar en un agente nuevo
    if (hit && hit !== prevHoveredRef.current) {
      audioManager.play('click');
    }
    prevHoveredRef.current = hit;
    setHoveredAgent(hit);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (transitioningRef.current) return;

    // Primer click: iniciar música ambiental
    if (!musicStartedRef.current) {
      musicStartedRef.current = true;
      audioManager.playMusic('/assets/audio/ambient-library.mp3', true);
    }

    const { mx, my } = getCanvasCoords(e);
    const hit = hitTestAgent(mx, my);
    if (hit) {
      audioManager.play('dialog-open');
      setSelectedAgent(hit);
    }
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

  const selectedAgentData = selectedAgent
    ? agentsRef.current.find((a) => a.id === selectedAgent)
    : null;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      {/* Botón mute — esquina superior derecha */}
      <button
        onClick={() => {
          const newMuted = audioManager.toggleMute();
          setMuted(newMuted);
        }}
        title={muted ? 'Activar sonido' : 'Silenciar'}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 20,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          color: '#666',
          padding: '4px 6px',
          lineHeight: 1,
          transition: 'color 0.15s',
        } as React.CSSProperties}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFD700')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredAgent(null)}
        onClick={handleClick}
        style={{
          imageRendering: 'pixelated',
          cursor: hoveredAgent ? 'pointer' : 'default',
          border: '4px solid #2A2A2A',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          background: '#000',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
        } as React.CSSProperties}
      />
      {selectedAgentData && (
        <DialogBox
          agent={selectedAgentData}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
