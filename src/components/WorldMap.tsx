import { useRef, useEffect, useCallback } from 'react';

interface WorldMapProps {
  selectedRoom: string;
  onRoomSelect: (id: string) => void;
  agents: string[];
}

interface RoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  icon: string;
}

const ROOMS: RoomDef[] = [
  { id: 'observatory', name: 'Observatory', x: 400, y: 40,  w: 160, h: 120, color: '#0a1a2a', icon: '🔭' },
  { id: 'library',     name: 'Library',     x: 400, y: 310, w: 160, h: 120, color: '#2a1a0a', icon: '📚' },
  { id: 'forge-room',  name: 'Forge',       x: 80,  y: 310, w: 160, h: 120, color: '#2a0a0a', icon: '⚒️' },
  { id: 'throne',      name: 'Throne Room', x: 720, y: 310, w: 160, h: 120, color: '#1a0a1a', icon: '🏰' },
];

const AGENT_COLORS: Record<string, string> = {
  percival: '#9B59B6',
  forge:    '#DC143C',
  sprite:   '#FF69B4',
};

// Corridors: [x1,y1,x2,y2] center-to-center
const CORRIDORS = [
  // Observatory → Library (vertical)
  { x1: 480, y1: 160, x2: 480, y2: 310 },
  // Forge → Library (horizontal)
  { x1: 240, y1: 370, x2: 400, y2: 370 },
  // Library → Throne (horizontal)
  { x1: 560, y1: 370, x2: 720, y2: 370 },
];

function getRoomCenter(r: RoomDef) {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

export function WorldMap({ selectedRoom, onRoomSelect, agents }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef<string | null>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Dot grid
    ctx.fillStyle = '#111';
    for (let x = 0; x < W; x += 20) {
      for (let y = 0; y < H; y += 20) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Decorative stars
    const stars = [
      [30, 50], [920, 80], [50, 500], [900, 480], [150, 200],
      [820, 300], [60, 380], [950, 200], [700, 50], [200, 520],
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (const [sx, sy] of stars) {
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Title
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('OASIS CASTLE', W / 2, 20);

    // Draw corridors
    for (const c of CORRIDORS) {
      // Border line
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(c.x1, c.y1);
      ctx.lineTo(c.x2, c.y2);
      ctx.stroke();
      // Fill
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(c.x1, c.y1);
      ctx.lineTo(c.x2, c.y2);
      ctx.stroke();
    }

    // Draw rooms
    for (const room of ROOMS) {
      const isSelected = room.id === selectedRoom;
      const isHovered = room.id === hoveredRef.current;
      const { cx, cy } = getRoomCenter(room);

      // Glow for selected
      if (isSelected) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
      }

      // Fill
      ctx.fillStyle = room.color;
      ctx.fillRect(room.x, room.y, room.w, room.h);

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Border
      ctx.strokeStyle = isSelected ? '#FFD700' : isHovered ? '#888' : '#444';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(room.x + 1.5, room.y + 1.5, room.w - 3, room.h - 3);

      // Icon
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.icon, cx, cy - 10);

      // Name
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#FFD700';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(room.name.toUpperCase(), cx, room.y + room.h - 12);

      // Agent dots — agents appear in selected room
      const roomAgents = isSelected ? agents : [];
      roomAgents.forEach((agentId, i) => {
        const color = AGENT_COLORS[agentId.toLowerCase()] ?? '#888';
        const dotX = room.x + 8 + i * 12;
        const dotY = room.y + 8;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Tooltip for hovered
    const hovered = ROOMS.find(r => r.id === hoveredRef.current);
    if (hovered) {
      const { cx } = getRoomCenter(hovered);
      const ty = hovered.y - 8;
      const label = hovered.name;
      ctx.font = '8px "Press Start 2P", monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(cx - tw / 2 - 6, ty - 16, tw + 12, 20);
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, cx, ty - 2);
    }
  }, [selectedRoom, agents]);

  useEffect(() => {
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const getRoomAt = (x: number, y: number): RoomDef | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (x - rect.left) * scaleX;
    const cy = (y - rect.top) * scaleY;
    return ROOMS.find(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) ?? null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const room = getRoomAt(e.clientX, e.clientY);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = room ? 'pointer' : 'default';
    hoveredRef.current = room?.id ?? null;
  };

  const handleMouseLeave = () => {
    hoveredRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const room = getRoomAt(e.clientX, e.clientY);
    if (room) onRoomSelect(room.id);
  };

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={600}
      style={{ display: 'block', maxWidth: '100%', imageRendering: 'pixelated' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
}
