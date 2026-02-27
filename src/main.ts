import Phaser from 'phaser';
import { CommandCenter } from './scenes/CommandCenter';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  scene: [CommandCenter],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

const game = new Phaser.Game(config);

export default game;
