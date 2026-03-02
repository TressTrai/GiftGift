import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '../utils/constants';
import { markTutorialSeen } from '../utils/storage';

/**
 * TutorialScene — 2-экранный онбординг (показывается только при первом заходе).
 * Свайп или кнопка для перехода между экранами.
 * Кнопка "Начать играть" на втором экране.
 */
export class TutorialScene extends Phaser.Scene {
  private page = 0;
  private pages!: Phaser.GameObjects.Container[];

  constructor() {
    super({ key: SCENE_KEYS.TUTORIAL });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.pages = [
      this.createPage1(width, height),
      this.createPage2(width, height),
    ];

    // Показываем только первую страницу
    this.pages[1].setVisible(false);

    // Индикаторы страниц
    const dot1 = this.add.circle(width / 2 - 12, height * 0.88, 5, COLORS.ACCENT_WARM);
    const dot2 = this.add.circle(width / 2 + 12, height * 0.88, 5, 0x444444);

    // Кнопка "Далее"
    const nextBtn = this.add
      .text(width / 2, height * 0.94, 'Далее →', {
        fontSize: '18px',
        color: '#ffb347',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    nextBtn.on('pointerup', () => {
      if (this.page === 0) {
        this.pages[0].setVisible(false);
        this.pages[1].setVisible(true);
        dot1.setFillStyle(0x444444);
        dot2.setFillStyle(COLORS.ACCENT_WARM);
        nextBtn.setText('Начать играть');
        this.page = 1;
      } else {
        this.startGame();
      }
    });

    // Свайп поддержка
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (Math.abs(ptr.downX - ptr.upX) > 50 && this.page === 0) {
        this.pages[0].setVisible(false);
        this.pages[1].setVisible(true);
        dot1.setFillStyle(0x444444);
        dot2.setFillStyle(COLORS.ACCENT_WARM);
        nextBtn.setText('Начать играть');
        this.page = 1;
      }
    });
  }

  private createPage1(w: number, h: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(
      this.add.text(w / 2, h * 0.10, 'Как играть', {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5),
    );

    const steps = [
      { icon: '🗺', text: 'Собирай предметы на сцене' },
      { icon: '🎁', text: 'Раскрывай подарки от коллег' },
      { icon: '🤝', text: 'Дари другим' },
      { icon: '✨', text: 'Вместе украшаем праздник!' },
    ];

    steps.forEach((step, i) => {
      const y = h * (0.25 + i * 0.14);
      items.push(
        this.add.text(w * 0.15, y, step.icon, { fontSize: '28px' }),
        this.add.text(w * 0.28, y, step.text, {
          fontSize: '16px',
          color: '#ffffff',
        }).setOrigin(0, 0.5),
      );
    });

    return this.add.container(0, 0, items);
  }

  private createPage2(w: number, h: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(
      this.add.text(w / 2, h * 0.10, 'Подробнее', {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5),
    );

    const details = [
      { icon: '🎯', text: 'Собери 3 целевых подарка.\nСпрашивай коллег что им нужно!' },
      { icon: '🔄', text: 'При передаривании подарок\nпревращается в другой — сюрприз!' },
    ];

    details.forEach((d, i) => {
      const y = h * (0.28 + i * 0.22);
      items.push(
        this.add.text(w * 0.12, y, d.icon, { fontSize: '32px' }),
        this.add.text(w * 0.26, y, d.text, {
          fontSize: '15px',
          color: '#ffffff',
          lineSpacing: 6,
        }).setOrigin(0, 0.5),
      );
    });

    return this.add.container(0, 0, items);
  }

  private startGame(): void {
    markTutorialSeen();
    this.scene.start(SCENE_KEYS.GAME);
    this.scene.start(SCENE_KEYS.UI);
  }
}
