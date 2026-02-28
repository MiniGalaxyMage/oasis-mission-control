export interface WalkableArea {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  icon: string;
  background: string;
  agentPositions: Record<string, { x: number; y: number }>;
  walkableArea: WalkableArea;
}

export const ROOMS: RoomConfig[] = [
  {
    id: 'library', name: 'Biblioteca Arcana', icon: '📚',
    background: '/assets/room/office-room.png',
    agentPositions: { forge: { x: 270, y: 420 }, percival: { x: 600, y: 370 }, sprite: { x: 940, y: 460 } },
    walkableArea: { minX: 100, maxX: 1100, minY: 370, maxY: 530 },
  },
  {
    id: 'throne', name: 'Throne Room', icon: '🏰',
    background: '/assets/room/throne-room.png',
    agentPositions: { forge: { x: 250, y: 430 }, percival: { x: 600, y: 380 }, sprite: { x: 920, y: 440 } },
    walkableArea: { minX: 80, maxX: 1120, minY: 380, maxY: 540 },
  },
  {
    id: 'observatory', name: 'Observatory', icon: '🔭',
    background: '/assets/room/observatory.png',
    agentPositions: { forge: { x: 280, y: 410 }, percival: { x: 580, y: 360 }, sprite: { x: 900, y: 450 } },
    walkableArea: { minX: 120, maxX: 1080, minY: 360, maxY: 520 },
  },
  {
    id: 'forge-room', name: 'The Forge', icon: '⚒️',
    background: '/assets/room/forge.png',
    agentPositions: { forge: { x: 300, y: 420 }, percival: { x: 620, y: 380 }, sprite: { x: 930, y: 450 } },
    walkableArea: { minX: 100, maxX: 1100, minY: 370, maxY: 530 },
  },
];

export const DEFAULT_ROOM = 'library';
