import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { revealGift } from '../api/game';
import { InventoryItem } from '../types';

interface RevealData {
  instanceId: string;
}

/**
 * RevealScene — анимация раскрытия подарка.
 * Пользователь тапает на коробку → shake → burst → reveal.
 */
export class RevealScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.REVEAL });
  }

  create(data: RevealData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;

    // Затемнение
    this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive();

    // Коробка с подарком — интерактивная
    const boxSize = Math.round(130 * s);
    const box = this.add
      .image(cx, height * 0.40, 'wrapped-gift')
      .setDisplaySize(boxSize, boxSize)
      .setInteractive({ useHandCursor: true });

    // Idle-анимация: лёгкое покачивание
    this.tweens.add({
      targets: box,
      y: box.y - Math.round(10 * s),
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const hint = this.add
      .text(cx, height * 0.56, 'Нажми, чтобы открыть!', {
        fontSize: `${Math.round(17 * s)}px`,
        color: '#ffb347',
      })
      .setOrigin(0.5);

    // Тап запускает раскрытие
    box.once('pointerup', () => {
      this.tweens.killTweensOf(box);
      hint.destroy();
      box.disableInteractive();
      this.startReveal(data.instanceId, box, cx, height, s);
    });

    // Закрытие по тапу вне коробки
    const closeDist = Math.round(80 * s);
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const d = Phaser.Math.Distance.Between(ptr.x, ptr.y, cx, height * 0.40);
      if (d > closeDist) this.scene.stop();
    });
  }

  private startReveal(
    instanceId: string,
    box: Phaser.GameObjects.Image,
    cx: number,
    height: number,
    s: number,
  ): void {
    if (this.cache.audio.exists('sfx-reveal')) this.sound.play('sfx-reveal', { volume: 0.7 });
    this.createShakeAnimation(box, s);

    revealGift(instanceId)
      .then(revealedItem => {
        gameStore.applyGiftRevealed(instanceId, revealedItem);

        this.time.delayedCall(600, () => {
          this.createBurstEffect(cx, height * 0.40, s);

          this.tweens.add({
            targets: box,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              box.destroy();
              this.showRevealResult(revealedItem, cx, height, s);
            },
          });
        });
      })
      .catch(() => this.scene.stop());
  }

  private createShakeAnimation(obj: Phaser.GameObjects.Image, s: number): void {
    const shakeAmt = Math.round(10 * s);
    this.tweens.add({
      targets: obj,
      x: { from: obj.x - shakeAmt, to: obj.x + shakeAmt },
      duration: 55,
      repeat: 8,
      yoyo: true,
    });
  }

  private createBurstEffect(x: number, y: number, s: number): void {
    const colors = [COLORS.ACCENT_WARM, COLORS.ACCENT_PINK, COLORS.ACCENT_BLUE, COLORS.SUCCESS];
    const particleR = Math.round(6 * s);
    const burstR    = Math.round(90 * s);

    colors.forEach(color => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const particle = this.add.circle(x, y, particleR, color);
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * burstR,
          y: y + Math.sin(angle) * burstR,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      }
    });
  }

  private showRevealResult(item: InventoryItem, cx: number, height: number, s: number): void {
    const entry = gameStore.getCatalogEntry(item.catalogId);
    const wordWrapW = this.scale.width - Math.round(48 * s);

    // Изображение подарка
    const imgSize = Math.round(140 * s);
    const img = this.add
      .image(cx, height * 0.32, entry?.imageKey ?? item.catalogId)
      .setDisplaySize(imgSize, imgSize)
      .setAlpha(0);

    // Название
    const nameText = this.add
      .text(cx, height * 0.52, entry?.name ?? item.catalogId, {
        fontSize: `${Math.round(22 * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Описание
    const descText = this.add
      .text(cx, height * 0.59, entry?.description ?? '', {
        fontSize: `${Math.round(13 * s)}px`,
        color: '#aaaaaa',
        wordWrap: { width: wordWrapW },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // От кого
    const fromStr = item.isAnonymous
      ? 'Анонимный подарок'
      : `От: ${item.fromUserName ?? '?'}`;

    const fromText = this.add
      .text(cx, height * 0.67, fromStr, {
        fontSize: `${Math.round(13 * s)}px`,
        color: item.isAnonymous ? '#888888' : '#87ceeb',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const targets: Phaser.GameObjects.GameObject[] = [img, nameText, descText, fromText];

    // Сообщение от дарителя
    let msgText: Phaser.GameObjects.Text | null = null;
    if (item.message) {
      msgText = this.add
        .text(cx, height * 0.73, `"${item.message}"`, {
          fontSize: `${Math.round(13 * s)}px`,
          color: '#cccccc',
          fontStyle: 'italic',
          wordWrap: { width: wordWrapW },
          align: 'center',
        })
        .setOrigin(0.5)
        .setAlpha(0);
      targets.push(msgText);
    }

    // Fade-in всего контента
    this.tweens.add({ targets, alpha: 1, duration: 400, ease: 'Power1' });

    // Кнопка «Спасибо!»
    const closeY = msgText ? height * 0.84 : height * 0.79;
    const btnW = Math.round(160 * s);
    const btnH = Math.round(44 * s);

    const closeBg = this.add
      .rectangle(cx, closeY, btnW, btnH, COLORS.PRIMARY)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const closeLabel = this.add
      .text(cx, closeY, 'Спасибо!', {
        fontSize: `${Math.round(16 * s)}px`,
        color: '#fff',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.time.delayedCall(400, () => {
      this.tweens.add({ targets: [closeBg, closeLabel], alpha: 1, duration: 300 });
    });

    closeBg.on('pointerup', () => {
      EventBus.emit(EVENTS.GIFT_REVEALED, item);
      this.scene.stop();
    });
  }
}
