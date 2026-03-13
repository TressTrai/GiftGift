import Phaser from 'phaser';

import { BootScene } from './scenes/BootScene';
import { AuthScene } from './scenes/AuthScene';
import { TutorialScene } from './scenes/TutorialScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { InventoryScene } from './scenes/InventoryScene';
import { ProfileScene } from './scenes/ProfileScene';
import { ItemDetailScene } from './scenes/ItemDetailScene';
import { GiftingScene } from './scenes/GiftingScene';
import { RevealScene } from './scenes/RevealScene';
import { FinaleScene } from './scenes/FinaleScene';
import { HourlyGrantScene } from './scenes/HourlyGrantScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#fdf0e4',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1080,   // Android portrait (1080×2400)
    height: 2400,
  },

  // DOM-элементы (формы, инпуты)
  dom: {
    createContainer: true,
  },

  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },

  scene: [
    BootScene,
    AuthScene,
    TutorialScene,
    GameScene,
    UIScene,
    InventoryScene,
    ProfileScene,
    ItemDetailScene,
    GiftingScene,
    RevealScene,
    FinaleScene,
    HourlyGrantScene,
  ],
};

new Phaser.Game(config);
