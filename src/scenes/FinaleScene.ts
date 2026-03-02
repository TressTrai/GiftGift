import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '../utils/constants';

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

    this.add.rectangle(0, 0, width, height, 0x0a0a1e).setOrigin(0);

    if (this.cache.audio.exists('sfx-finale')) this.sound.play('sfx-finale', { volume: 1 });

    // Фейерверк из частиц
    this.createFireworks(width, height);

    // Главный текст
    const mainText = this.add
      .text(cx, height * 0.35, 'Мы вместе\nукрасили праздник!', {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffb347',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: mainText, alpha: 1, duration: 800, delay: 200 });

    // Количество подарков
    const subText = this.add
      .text(cx, height * 0.52, 'Спасибо всем участникам!', {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: subText, alpha: 1, duration: 600, delay: 800 });

    // Кнопка "Посмотреть сцену" — через 4 сек
    this.time.delayedCall(4000, () => {
      const btnBg = this.add
        .rectangle(cx, height * 0.70, 200, 46, COLORS.PRIMARY)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add
        .text(cx, height * 0.70, 'Посмотреть итог', {
          fontSize: '16px',
          color: '#fff',
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 400 });

      btnBg.on('pointerup', () => this.scene.stop());
    });
  }

  private createFireworks(w: number, h: number): void {
    const colors = [
      COLORS.ACCENT_WARM,
      COLORS.ACCENT_PINK,
      COLORS.ACCENT_BLUE,
      COLORS.SUCCESS,
      0xffffff,
    ];

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
          const dist = Phaser.Math.Between(60, 110);
          const p = this.add.circle(x, y, 5, color);
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
