import Phaser from 'phaser';
import { TaskData } from '../types';

/**
 * TaskBoard — tablón de misiones en la pared izquierda.
 * Muestra las tareas activas del snapshot.
 */
export class TaskBoard {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private textLines: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(50, 120);
    this.container.setDepth(8);
  }

  create(tasks: TaskData[]): void {
    this.container.removeAll(true);
    this.textLines = [];

    const gfx = this.scene.add.graphics();

    // Marco de madera
    gfx.fillStyle(0x5c3a1e);
    gfx.fillRect(0, 0, 160, 150);
    gfx.fillStyle(0x7a5230);
    gfx.fillRect(4, 4, 152, 142);
    // Papel/pergamino interior
    gfx.fillStyle(0xd4b483);
    gfx.fillRect(8, 8, 144, 134);
    // Tachuela superior izquierda
    gfx.fillStyle(0x888888);
    gfx.fillCircle(16, 16, 4);
    // Tachuela superior derecha
    gfx.fillCircle(152, 16, 4);

    this.container.add(gfx);

    // Título
    const title = this.scene.add.text(80, 16, '📋 MISIONES', {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#3a2010',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Línea separadora
    const line = this.scene.add.graphics();
    line.lineStyle(1, 0x6b4020, 1);
    line.lineBetween(12, 28, 148, 28);
    this.container.add(line);

    // Tareas (máximo 5)
    const visible = tasks.slice(0, 5);
    visible.forEach((task, i) => {
      const color = task.status === 'done'
        ? '#448844'
        : task.status === 'blocked'
        ? '#884444'
        : '#332211';

      const bullet = task.status === 'done' ? '✓' : task.status === 'blocked' ? '✗' : '▶';
      const text = this.scene.add.text(
        12,
        34 + i * 20,
        `${bullet} ${truncate(task.branch, 17)}`,
        {
          fontSize: '6px',
          fontFamily: '"Press Start 2P", monospace',
          color,
          wordWrap: { width: 136 },
        }
      );
      this.container.add(text);
      this.textLines.push(text);
    });

    if (tasks.length === 0) {
      const empty = this.scene.add.text(80, 70, 'Sin tareas', {
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#888866',
      }).setOrigin(0.5, 0.5);
      this.container.add(empty);
    }
  }

  update(tasks: TaskData[]): void {
    this.create(tasks);
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}
