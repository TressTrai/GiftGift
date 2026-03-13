import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS } from '../utils/constants';

/**
 * FinaleScene — кульминационное событие в 19:00.
 * Полноэкранный celebration: фейерверк, поздравление, результат коллективной цели.
 */
export class FinaleScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.FINALE });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, 0x0a0a1e).setOrigin(0);

    if (this.cache.audio.exists('sfx-finale')) this.sound.play('sfx-finale', { volume: 1 });

    // Фейерверк из частиц
    this.createFireworks(width, height, s);

    // Главный текст
    const mainText = this.add
      .text(cx, height * 0.35, 'Мы вместе\nукрасили праздник!', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XXL * s)}px`,
        fontStyle: 'bold',
        color: CSS.ACCENT_AMBER,
        align: 'center',
        lineSpacing: Math.round(8 * s),
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: mainText, alpha: 1, duration: 800, delay: 200 });

    // Количество подарков
    const subText = this.add
      .text(cx, height * 0.52, 'Спасибо всем участникам!', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: '#cccccc',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: subText, alpha: 1, duration: 600, delay: 800 });

    // Кнопка "Посмотреть итог" — через 4 сек
    this.time.delayedCall(4000, () => {
      const btnW = Math.round(200 * s);
      const btnH = Math.round(46 * s);

      const btnBg = this.add
        .rectangle(cx, height * 0.70, btnW, btnH, COLORS.PRIMARY)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add
        .text(cx, height * 0.70, 'Посмотреть итог', {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.MD * s)}px`,
          color: CSS.TEXT_LIGHT,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 400 });

      btnBg.on('pointerup', () => this.scene.stop());
    });
  }

  private createFireworks(w: number, h: number, s: number): void {
    const colors = [
      COLORS.ACCENT_AMBER,
      COLORS.ACCENT_PINK,
      COLORS.ACCENT_TEAL,
      COLORS.ACCENT_OLIVE,
      0xffffff,
    ];

    const particleR  = Math.round(5 * s);
    const distMin    = Math.round(60 * s);
    const distMax    = Math.round(110 * s);

    let count = 0;
    const timer = this.time.addEvent({
      delay: 400,
      repeat: 12,
      callback: () => {
        const x = Phaser.Math.Between(w * 0.15, w * 0.85);
        const y = Phaser.Math.Between(h * 0.10, h * 0.55);
        const color = colors[count % colors.length];
        count++;

        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const dist = Phaser.Math.Between(distMin, distMax);
          const p = this.add.circle(x, y, particleR, color);
          this.tweens.add({
            targets: p,
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: Phaser.Math.Between(500, 900),
            ease: 'Power2',
            onComplete: () => p.destroy(),
          });
        }
      },
    });

    // Таймер автоматически останавливается через repeat
    void timer;
  }
}
