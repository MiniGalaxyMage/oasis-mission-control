import { CollisionMap } from './CollisionMap';

export interface WalkerConfig {
  startTileX: number;
  startTileY: number;
  speed: number;       // pixels per second
  idleTimeMs: number;  // base idle time (will randomize ±1000ms)
}

type Direction = 'down' | 'left' | 'right' | 'up';

export class AgentWalker {
  private collisionMap: CollisionMap;
  private config: WalkerConfig;

  private _x: number;
  private _y: number;
  private _direction: Direction = 'down';
  private _isMoving = false;

  // Current destination pixel
  private destX: number;
  private destY: number;

  // Idle countdown (ms)
  private idleTimer = 0;

  // Phase: 'idle' | 'moving_x' | 'moving_y'
  private phase: 'idle' | 'moving_x' | 'moving_y' = 'idle';

  // Current destination tile
  private destTileX = 0;
  private destTileY = 0;

  constructor(collisionMap: CollisionMap, config: WalkerConfig) {
    this.collisionMap = collisionMap;
    this.config = config;

    const startPixel = collisionMap.tileToPixel(config.startTileX, config.startTileY);
    this._x = startPixel.px;
    this._y = startPixel.py;
    this.destX = this._x;
    this.destY = this._y;

    // Start idle
    this.idleTimer = config.idleTimeMs + (Math.random() - 0.5) * 2000;
  }

  private pickNewDestination(): void {
    const walkable = this.collisionMap.getWalkableTiles();
    if (walkable.length === 0) return;

    // Try a few random tiles to find one reachable
    for (let attempt = 0; attempt < 20; attempt++) {
      const tile = walkable[Math.floor(Math.random() * walkable.length)];
      // Skip if too close
      const pixel = this.collisionMap.tileToPixel(tile.tx, tile.ty);
      const dx = Math.abs(pixel.px - this._x);
      const dy = Math.abs(pixel.py - this._y);
      if (dx + dy < this.collisionMap.tileWidth * 2) continue;

      this.destTileX = tile.tx;
      this.destTileY = tile.ty;
      const dest = this.collisionMap.tileToPixel(tile.tx, tile.ty);
      this.destX = dest.px;
      this.destY = dest.py;

      // Decide: move in X first if significant difference, else Y
      if (Math.abs(this._x - this.destX) > this.collisionMap.tileWidth / 2) {
        this.phase = 'moving_x';
      } else {
        this.phase = 'moving_y';
      }
      this._isMoving = true;
      return;
    }
  }

  private nextTileInDirection(dx: number, dy: number): { tx: number; ty: number } {
    const { tx, ty } = this.collisionMap.pixelToTile(this._x + dx, this._y + dy);
    return { tx, ty };
  }

  update(dt: number): void {
    if (this.phase === 'idle') {
      this._isMoving = false;
      this.idleTimer -= dt * 1000;
      if (this.idleTimer <= 0) {
        this.pickNewDestination();
      }
      return;
    }

    const speed = this.config.speed;
    const step = speed * dt;

    if (this.phase === 'moving_x') {
      const diffX = this.destX - this._x;
      if (Math.abs(diffX) < 2) {
        // Aligned on X, switch to Y
        this._x = this.destX;
        this.phase = 'moving_y';
        return;
      }

      const moveX = Math.sign(diffX) * Math.min(Math.abs(diffX), step);
      const nextX = this._x + moveX;
      const { tx, ty } = this.collisionMap.pixelToTile(nextX, this._y);

      if (this.collisionMap.canWalk(tx, ty)) {
        this._x = nextX;
        this._direction = diffX > 0 ? 'right' : 'left';
        this._isMoving = true;
      } else {
        // Blocked — try Y next or pick new dest
        this.phase = 'moving_y';
      }
    } else if (this.phase === 'moving_y') {
      const diffY = this.destY - this._y;
      if (Math.abs(diffY) < 2) {
        // Arrived
        this._y = this.destY;
        this.phase = 'idle';
        this._isMoving = false;
        this.idleTimer = this.config.idleTimeMs + (Math.random() - 0.5) * 2000;
        return;
      }

      const moveY = Math.sign(diffY) * Math.min(Math.abs(diffY), step);
      const nextY = this._y + moveY;
      const { tx, ty } = this.collisionMap.pixelToTile(this._x, nextY);

      if (this.collisionMap.canWalk(tx, ty)) {
        this._y = nextY;
        this._direction = diffY > 0 ? 'down' : 'up';
        this._isMoving = true;
      } else {
        // Blocked — pick new destination
        this.phase = 'idle';
        this._isMoving = false;
        this.idleTimer = 500; // short wait then try again
      }
    }
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get direction(): Direction { return this._direction; }
  get isMoving(): boolean { return this._isMoving; }

  /** Current destination tile for debug */
  get destTile(): { tx: number; ty: number } {
    return { tx: this.destTileX, ty: this.destTileY };
  }
}
