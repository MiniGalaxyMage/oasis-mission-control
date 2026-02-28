export interface SpriteAnimatorConfig {
  imageSrc: string;
  cellWidth: number;
  cellHeight: number;
  columns: number;
  fps: number;
}

export class SpriteAnimator {
  private config: SpriteAnimatorConfig;
  private image: HTMLImageElement | null = null;
  private loaded = false;

  constructor(config: SpriteAnimatorConfig) {
    this.config = config;
  }

  async load(): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.loaded = true;
        resolve();
      };
      img.onerror = reject;
      img.src = this.config.imageSrc;
    });
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  getCurrentFrame(elapsedMs: number): number {
    const { fps, columns } = this.config;
    const frameIndex = Math.floor((elapsedMs / 1000) * fps) % columns;
    return frameIndex;
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    row: number,
    col: number,
    x: number,
    y: number,
    scale: number
  ): void {
    if (!this.image || !this.loaded) return;
    const { cellWidth, cellHeight } = this.config;
    const srcX = col * cellWidth;
    const srcY = row * cellHeight;
    const dstW = cellWidth * scale;
    const dstH = cellHeight * scale;
    ctx.drawImage(
      this.image,
      srcX, srcY, cellWidth, cellHeight,
      x, y, dstW, dstH
    );
  }
}
