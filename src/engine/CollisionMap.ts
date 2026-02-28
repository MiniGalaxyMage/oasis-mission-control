export class CollisionMap {
  private matrix: string[];
  private _cols: number;
  private _rows: number;
  private _tileWidth: number;
  private _tileHeight: number;
  private normalizedMatrix: string[];

  constructor(rawMatrix: string[], canvasWidth: number, canvasHeight: number) {
    // Normalize: pad shorter rows with 'W' to match longest row length
    const maxLen = Math.max(...rawMatrix.map((r) => r.length));
    this.normalizedMatrix = rawMatrix.map((row) =>
      row.length < maxLen ? row + 'W'.repeat(maxLen - row.length) : row
    );
    this._cols = maxLen;
    this._rows = rawMatrix.length;
    this._tileWidth = canvasWidth / this._cols;
    this._tileHeight = canvasHeight / this._rows;
    this.matrix = this.normalizedMatrix;
  }

  canWalk(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this._cols || tileY >= this._rows) return false;
    return this.matrix[tileY][tileX] === '.';
  }

  pixelToTile(px: number, py: number): { tx: number; ty: number } {
    return {
      tx: Math.floor(px / this._tileWidth),
      ty: Math.floor(py / this._tileHeight),
    };
  }

  tileToPixel(tx: number, ty: number): { px: number; py: number } {
    return {
      px: tx * this._tileWidth + this._tileWidth / 2,
      py: ty * this._tileHeight + this._tileHeight / 2,
    };
  }

  get tileWidth(): number {
    return this._tileWidth;
  }

  get tileHeight(): number {
    return this._tileHeight;
  }

  get rows(): number {
    return this._rows;
  }

  get cols(): number {
    return this._cols;
  }

  getTileType(tx: number, ty: number): string {
    if (tx < 0 || ty < 0 || tx >= this._cols || ty >= this._rows) return 'W';
    return this.matrix[ty][tx];
  }

  /** Returns all walkable tiles as [{tx, ty}] */
  getWalkableTiles(): { tx: number; ty: number }[] {
    const result: { tx: number; ty: number }[] = [];
    for (let ty = 0; ty < this._rows; ty++) {
      for (let tx = 0; tx < this._cols; tx++) {
        if (this.canWalk(tx, ty)) result.push({ tx, ty });
      }
    }
    return result;
  }
}
