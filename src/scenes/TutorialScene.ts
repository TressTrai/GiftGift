import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS } from '../utils/constants';
import { markTutorialSeen } from '../utils/storage';

export class TutorialScene extends Phaser.Scene {
  private page = 0;
  private pages!: Phaser.GameObjects.Container[];

  constructor() {
    super({ key: SCENE_KEYS.TUTORIAL });
  }

  create(): void {
    const { width, height } = this.scale;
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.pages = [
      this.createPage1(width, height, s),
      this.createPage2(width, height, s),
    ];
    this.pages[1].setVisible(false);

    const dotR   = Math.round(5 * s);
    const dotOff = Math.round(12 * s);
    const dot1 = this.add.circle(width / 2 - dotOff, height * 0.88, dotR, COLORS.ACCENT_AMBER);
    const dot2 = this.add.circle(width / 2 + dotOff, height * 0.88, dotR, COLORS.ITEM_BORDER);

    const nextBtn = this.add
      .text(width / 2, height * 0.94, 'Далее →', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.LG * s)}px`,
        color: CSS.ACCENT_AMBER,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const goToPage2 = () => {
      this.pages[0].setVisible(false);
      this.pages[1].setVisible(true);
      dot1.setFillStyle(COLORS.ITEM_BORDER);
      dot2.setFillStyle(COLORS.ACCENT_AMBER);
      nextBtn.setText('Начать играть');
      this.page = 1;
    };

    nextBtn.on('pointerup', () => {
      if (this.page === 0) goToPage2();
      else this.startGame();
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (Math.abs(ptr.downX - ptr.upX) > 50 && this.page === 0) goToPage2();
    });
  }

  private createPage1(w: number, h: number, s: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(
      this.add.text(w / 2, h * 0.09, 'Как играть', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XL * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT,
      }).setOrigin(0.5),
    );

    const steps = [
      { icon: '🌍', text: 'Собирай предметы на сцене' },
      { icon: '🎁', text: 'Раскрывай подарки от коллег' },
      { icon: '🤝', text: 'Дари другим' },
      { icon: '✨', text: 'Вместе украшаем праздник!' },
    ];

    steps.forEach((step, i) => {
      const y = h * (0.22 + i * 0.15);
      items.push(
        this.add.text(w * 0.12, y, step.icon, {
          fontSize: `${Math.round(20 * s)}px`,
          padding: { x: Math.round(4 * s), y: Math.round(4 * s) },
        }).setOrigin(0.5),
        this.add.text(w * 0.24, y, step.text, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.SM * s)}px`,
          color: CSS.TEXT,
          wordWrap: { width: w * 0.68 },
        }).setOrigin(0, 0.5),
      );
    });

    return this.add.container(0, 0, items);
  }

  private createPage2(w: number, h: number, s: number): Phaser.GameObjects.Container {
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(
      this.add.text(w / 2, h * 0.09, 'Подробнее', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XL * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT,
      }).setOrigin(0.5),
    );

    const details = [
      { icon: '🎯', text: 'Собери 3 целевых подарка.\nСпрашивай коллег что им нужно!' },
      { icon: '🔄', text: 'При передаривании подарок\nпревращается в другой — сюрприз!' },
    ];

    details.forEach((d, i) => {
      const y = h * (0.26 + i * 0.26);
      items.push(
        this.add.text(w * 0.12, y, d.icon, {
          fontSize: `${Math.round(20 * s)}px`,
          padding: { x: Math.round(4 * s), y: Math.round(4 * s) },
        }).setOrigin(0.5),
        this.add.text(w * 0.24, y, d.text, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.SM * s)}px`,
          color: CSS.TEXT,
          lineSpacing: 6,
          wordWrap: { width: w * 0.68 },
        }).setOrigin(0, 0.5),
      );
    });

    return this.add.container(0, 0, items);
  }

  private startGame(): void {
    markTutorialSeen();
    [SCENE_KEYS.PROFILE, SCENE_KEYS.INVENTORY, SCENE_KEYS.UI].forEach(key => {
      if (this.scene.isActive(key)) this.scene.stop(key);
    });
    this.scene.start(SCENE_KEYS.GAME);
    this.scene.launch(SCENE_KEYS.UI);
  }
}
