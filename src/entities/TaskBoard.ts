import Phaser from 'phaser';
import { TaskData } from '../types';

const STATUS_ICON: Record<string, string> = {
  'in-progress': '🔧',
  'done': '✅',
  'blocked': '🚫',
};

export class TaskBoard extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Graphics;
  private tasks: TaskData[] = [];
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private boardWidth: number;
  private boardHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, boardWidth: number, boardHeight: number) {
    super(scene, x, y);
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.build();
    scene.add.existing(this);
  }

  private build(): void {
    this.bg = this.scene.add.graphics();
    this.drawBg();
    this.add(this.bg);

    const title = this.scene.add.text(10, 8, '📋 TAREAS ACTIVAS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#00ff88',
    });
    this.add(title);
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x0d0d1a, 0.95);
    this.bg.lineStyle(1, 0x00ff88, 0.8);
    this.bg.fillRect(0, 0, this.boardWidth, this.boardHeight);
    this.bg.strokeRect(0, 0, this.boardWidth, this.boardHeight);
  }

  updateTasks(tasks: TaskData[]): void {
    this.tasks = tasks;
    this.itemTexts.forEach(t => t.destroy());
    this.itemTexts = [];

    tasks.slice(0, 5).forEach((task, i) => {
      const icon = STATUS_ICON[task.status] ?? '▸';
      const label = `▸ ${task.branch} — ${task.agent} — ${icon}`;
      const t = this.scene.add.text(10, 26 + i * 16, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: task.status === 'done' ? '#888888' : '#cccccc',
        wordWrap: { width: this.boardWidth - 20 },
      });
      this.add(t);
      this.itemTexts.push(t);
    });
  }

  resize(boardWidth: number, boardHeight: number): void {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.drawBg();
    this.updateTasks(this.tasks);
  }
}
