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

    // Затемнение
    this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive();

    // Коробка с подарком — интерактивная
    const box = this.add
      .image(cx, height * 0.40, 'wrapped-gift')
      .setDisplaySize(130, 130)
      .setInteractive({ useHandCursor: true });

    // Idle-анимация: лёгкое покачивание
    this.tweens.add({
      targets: box,
      y: box.y - 10,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const hint = this.add
      .text(cx, height * 0.56, 'Нажми, чтобы открыть!', {
        fontSize: '17px',
        color: '#ffb347',
      })
      .setOrigin(0.5);

    // Тап запускает раскрытие
    box.once('pointerup', () => {
      this.tweens.killTweensOf(box);
      hint.destroy();
      box.disableInteractive();
      this.startReveal(data.instanceId, box, cx, height);
    });

    // Закрытие по тапу вне коробки
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const d = Phaser.Math.Distance.Between(ptr.x, ptr.y, cx, height * 0.40);
      if (d > 80) this.scene.stop();
    });
  }

  private startReveal(instanceId: string, box: Phaser.GameObjects.Image, cx: number, height: number): void {
    if (this.cache.audio.exists('sfx-reveal')) this.sound.play('sfx-reveal', { volume: 0.7 });
    this.createShakeAnimation(box);

    revealGift(instanceId)
      .then(revealedItem => {
        gameStore.applyGiftRevealed(instanceId, revealedItem);

        this.time.delayedCall(600, () => {
          this.createBurstEffect(cx, height * 0.40);

          this.tweens.add({
            targets: box,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              box.destroy();
              this.showRevealResult(revealedItem, cx, height);
            },
          });
        });
      })
      .catch(() => this.scene.stop());
  }

  private createShakeAnimation(obj: Phaser.GameObjects.Image): void {
    this.tweens.add({
      targets: obj,
      x: { from: obj.x - 10, to: obj.x + 10 },
      duration: 55,
      repeat: 8,
      yoyo: true,
    });
  }

  private createBurstEffect(x: number, y: number): void {
    const colors = [COLORS.ACCENT_WARM, COLORS.ACCENT_PINK, COLORS.ACCENT_BLUE, COLORS.SUCCESS];

    colors.forEach(color => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const particle = this.add.circle(x, y, 6, color);
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * 90,
          y: y + Math.sin(angle) * 90,
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

  private showRevealResult(item: InventoryItem, cx: number, height: number): void {
    const entry = gameStore.getCatalogEntry(item.catalogId);

    // Изображение подарка
    const img = this.add
      .image(cx, height * 0.32, entry?.imageKey ?? item.catalogId)
      .setDisplaySize(140, 140)
      .setAlpha(0);

    // Название
    const nameText = this.add
      .text(cx, height * 0.52, entry?.name ?? item.catalogId, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Описание
    const descText = this.add
      .text(cx, height * 0.59, entry?.description ?? '', {
        fontSize: '13px',
        color: '#aaaaaa',
        wordWrap: { width: this.scale.width - 48 },
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
        fontSize: '13px',
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
          fontSize: '13px',
          color: '#cccccc',
          fontStyle: 'italic',
          wordWrap: { width: this.scale.width - 48 },
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

    const closeBg = this.add
      .rectangle(cx, closeY, 160, 44, COLORS.PRIMARY)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const closeLabel = this.add
      .text(cx, closeY, 'Спасибо!', { fontSize: '16px', color: '#fff' })
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
