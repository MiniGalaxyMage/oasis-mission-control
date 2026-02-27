import Phaser from 'phaser';
import { CommandCenter } from './scenes/CommandCenter';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#1a1a2e',
  scene: [CommandCenter],
};

console.log('[OASIS] Iniciando Phaser...');
const game = new Phaser.Game(config);
console.log('[OASIS] Phaser creado:', game);
