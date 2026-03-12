import Phaser from 'phaser';
import { SCENE_KEYS } from '../utils/constants';
import { getToken, clearToken, isTutorialSeen } from '../utils/storage';
import { CatalogEntry } from '../types';
import { gameStore } from '../store/GameStore';
import { fetchState } from '../api/game';

/**
 * BootScene — загружает все статические ассеты.
 * После загрузки переходит к AuthScene или сразу в игру если токен есть.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    // Прогресс-бар загрузки
    this.createLoadingBar();

    // Каталог подарков
    this.load.json('catalog', 'assets/catalog.json');

    // Фоновая иллюстрация сцены
    this.load.image('scene-bg', 'assets/images/scene/background.jpg');

    // 50 подарков из каталога
    for (let i = 1; i <= 50; i++) {
      this.load.image(`gift-${i}`, `assets/images/gifts/gift-${i}.png`);
    }

    // UI ассеты
    this.load.image('wrapped-gift', 'assets/images/ui/wrapped-gift.png');
    this.load.image('icon-scene', 'assets/images/ui/icon-scene.png');
    this.load.image('icon-inventory', 'assets/images/ui/icon-inventory.png');
    this.load.image('icon-profile', 'assets/images/ui/icon-profile.png');
    this.load.image('particle', 'assets/images/ui/particle.png');

    // 10-15 элементов прогресса коллективной цели
    for (let i = 1; i <= 12; i++) {
      this.load.image(`progress-el-${i}`, `assets/images/scene/progress-el-${i}.png`);
    }

  }

  create(): void {
    const catalog = this.cache.json.get('catalog') as CatalogEntry[];
    gameStore.initCatalog(catalog);

    if (!getToken()) {
      this.scene.start(SCENE_KEYS.AUTH);
      return;
    }

    // Токен есть — грузим состояние перед запуском игры
    fetchState()
      .then(state => {
        gameStore.init(state);
        const nextScene = isTutorialSeen() ? SCENE_KEYS.GAME : SCENE_KEYS.TUTORIAL;
        this.scene.start(nextScene);
        if (nextScene === SCENE_KEYS.GAME) {
          this.scene.start(SCENE_KEYS.UI);
        }
      })
      .catch(() => {
        // Токен протух или сервер недоступен — на экран входа
        clearToken();
        this.scene.start(SCENE_KEYS.AUTH);
      });
  }

  private createLoadingBar(): void {
    const { width, height } = this.scale;
    const s = width / 390;
    const barW  = Math.round(300 * s);
    const barH  = Math.round(20 * s);
    const fillH = Math.round(16 * s);

    const barBg = this.add.rectangle(width / 2, height / 2, barW, barH, 0x333333);
    const bar = this.add.rectangle(width / 2 - barW / 2, height / 2, 0, fillH, 0xffb347);
    bar.setOrigin(0, 0.5);

    const text = this.add
      .text(width / 2, height / 2 + Math.round(40 * s), 'Загрузка...', {
        fontSize: `${Math.round(16 * s)}px`,
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = (barW - Math.round(4 * s)) * value;
    });

    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      text.destroy();
    });
  }
}
