// ─── Agent Walker — autonomous movement system ──────────────────
export interface WalkTarget {
  x: number;
  y: number;
}

export interface WalkerState {
  currentPos: { x: number; y: number };
  homePos: { x: number; y: number };
  target: WalkTarget | null;
  speed: number; // pixels per frame
  isMoving: boolean;
  facingLeft: boolean;
  idleTimer: number; // frames until next wander
}

export interface WalkableArea {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const FPS = 60;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function createWalkerState(homePos: { x: number; y: number }): WalkerState {
  return {
    currentPos: { x: homePos.x, y: homePos.y },
    homePos: { x: homePos.x, y: homePos.y },
    target: null,
    speed: randomBetween(0.5, 1.0),
    isMoving: false,
    facingLeft: false,
    idleTimer: Math.floor(randomBetween(2, 5) * FPS),
  };
}

export function updateWalker(
  state: WalkerState,
  agentStatus: string,
  area: WalkableArea,
): WalkerState {
  let { currentPos, homePos, target, speed, isMoving, facingLeft, idleTimer } = state;

  if (agentStatus === 'sleeping') {
    // Sleeping: return to home position and stay still
    const dx = homePos.x - currentPos.x;
    const dy = homePos.y - currentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const nx = currentPos.x + (dx / dist) * Math.min(speed * 1.5, dist);
      const ny = currentPos.y + (dy / dist) * Math.min(speed * 1.5, dist);
      facingLeft = dx < 0;
      currentPos = { x: nx, y: ny };
      isMoving = true;
    } else {
      currentPos = { ...homePos };
      isMoving = false;
    }
    return { ...state, currentPos, isMoving, facingLeft, target: null, idleTimer };
  }

  // working / idle: wander around (actively doing things)
  if (target === null) {
    if (idleTimer > 0) {
      idleTimer--;
      isMoving = false;
      return { ...state, currentPos, isMoving, facingLeft, target, idleTimer };
    }
    // Pick a new wander target near home
    const tx = clamp(homePos.x + randomBetween(-100, 100), area.minX, area.maxX);
    const ty = clamp(homePos.y + randomBetween(-30, 30), area.minY, area.maxY);
    target = { x: tx, y: ty };
  }

  // Move toward target
  const dx = target.x - currentPos.x;
  const dy = target.y - currentPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1.5) {
    // Arrived — start idle timer
    currentPos = { ...target };
    target = null;
    isMoving = false;
    idleTimer = Math.floor(randomBetween(3, 8) * FPS);
  } else {
    const step = Math.min(speed, dist);
    currentPos = {
      x: currentPos.x + (dx / dist) * step,
      y: currentPos.y + (dy / dist) * step,
    };
    facingLeft = dx < 0;
    isMoving = true;
  }

  return { ...state, currentPos, target, isMoving, facingLeft, idleTimer };
}
