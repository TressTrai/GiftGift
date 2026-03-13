import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { revealGift } from '../api/game';
import { RevealResult } from '../types';

interface RevealData {
  instanceId: string;
}

export class RevealScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.REVEAL });
  }

  create(data: RevealData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive();

    const boxSize = Math.round(130 * s);
    const box = this.add
      .image(cx, height * 0.40, 'wrapped-gift')
      .setDisplaySize(boxSize, boxSize)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: box,
      y: box.y - Math.round(10 * s),
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const hint = this.add
      .text(cx, height * 0.56, 'Нажми, чтобы открыть!', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.LG * s)}px`,
        color: CSS.ACCENT_AMBER,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const closeDist = Math.round(80 * s);
    const closeFn = (ptr: Phaser.Input.Pointer) => {
      const d = Phaser.Math.Distance.Between(ptr.x, ptr.y, cx, height * 0.40);
      if (d > closeDist) this.scene.stop();
    };
    this.input.on('pointerup', closeFn);

    box.once('pointerup', () => {
      this.input.off('pointerup', closeFn);
      this.tweens.killTweensOf(box);
      hint.destroy();
      box.disableInteractive();
      this.startReveal(data.instanceId, box, cx, height, s);
    });
  }

  private startReveal(instanceId: string, box: Phaser.GameObjects.Image, cx: number, height: number, s: number): void {
    if (this.cache.audio.exists('sfx-reveal')) this.sound.play('sfx-reveal', { volume: 0.7 });
    this.createShakeAnimation(box, s);

    revealGift(instanceId)
      .then(result => {
        const trioCompleted = gameStore.applyGiftRevealed(instanceId, result);
        this.time.delayedCall(600, () => {
          this.createBurstEffect(cx, height * 0.40, s);
          this.tweens.add({
            targets: box, scaleX: 2, scaleY: 2, alpha: 0, duration: 300,
            onComplete: () => { box.destroy(); this.showRevealResult(result, trioCompleted, cx, height, s); },
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
      duration: 55, repeat: 8, yoyo: true,
    });
  }

  private createBurstEffect(x: number, y: number, s: number): void {
    const colors = [COLORS.ACCENT_AMBER, COLORS.ACCENT_PINK, COLORS.ACCENT_TEAL, COLORS.ACCENT_OLIVE];
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
          alpha: 0, scaleX: 0, scaleY: 0, duration: 500, ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      }
    });
  }

  private showRevealResult(item: RevealResult, trioCompleted: boolean, cx: number, height: number, s: number): void {
    const entry = gameStore.getCatalogEntry(item.catalogId);
    const wordWrapW = this.scale.width - Math.round(48 * s);

    const imgSize = Math.round(140 * s);
    const img = this.add
      .image(cx, height * 0.32, entry?.imageKey ?? item.catalogId)
      .setDisplaySize(imgSize, imgSize).setAlpha(0);

    const nameText = this.add
      .text(cx, height * 0.52, entry?.name ?? item.catalogId, {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XXL * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5).setAlpha(0);

    const descText = this.add
      .text(cx, height * 0.59, entry?.description ?? '', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: '#cccccc',
        wordWrap: { width: wordWrapW },
        align: 'center',
      })
      .setOrigin(0.5).setAlpha(0);

    const fromStr = item.isAnonymous ? 'Анонимный подарок' : `От: ${item.fromUserName ?? '?'}`;
    const fromText = this.add
      .text(cx, height * 0.67, fromStr, {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: item.isAnonymous ? '#aaaaaa' : CSS.ACCENT_TEAL,
      })
      .setOrigin(0.5).setAlpha(0);

    const targets: Phaser.GameObjects.GameObject[] = [img, nameText, descText, fromText];

    let msgText: Phaser.GameObjects.Text | null = null;
    if (item.message) {
      msgText = this.add
        .text(cx, height * 0.73, `"${item.message}"`, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.SM * s)}px`,
          color: '#cccccc',
          fontStyle: 'italic',
          wordWrap: { width: wordWrapW },
          align: 'center',
        })
        .setOrigin(0.5).setAlpha(0);
      targets.push(msgText);
    }

    this.tweens.add({ targets, alpha: 1, duration: 400, ease: 'Power1' });

    const closeY = msgText ? height * 0.84 : height * 0.79;
    const btnW = Math.round(168 * s);
    const btnH = Math.round(48 * s);

    const closeBg = this.add
      .rectangle(cx, closeY, btnW, btnH, COLORS.BUTTON_PRIMARY)
      .setInteractive({ useHandCursor: true }).setAlpha(0);

    const closeLabel = this.add
      .text(cx, closeY, 'Спасибо!', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: CSS.TEXT_LIGHT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(400, () => {
      this.tweens.add({ targets: [closeBg, closeLabel], alpha: 1, duration: 300 });
    });

    closeBg.on('pointerup', () => {
      EventBus.emit(EVENTS.GIFT_REVEALED, item);
      if (trioCompleted) this.showTrioCompletedScreen(cx, height, s);
      else this.scene.stop();
    });
  }

  private showTrioCompletedScreen(cx: number, height: number, s: number): void {
    this.add.rectangle(0, 0, cx * 2, height, 0x000000, 0.92).setOrigin(0);

    if (this.cache.audio.exists('sfx-trio-complete')) {
      this.sound.play('sfx-trio-complete', { volume: 0.8 });
    }

    const titleText = this.add
      .text(cx, height * 0.22, 'Тройка собрана!', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XXL * s)}px`,
        fontStyle: 'bold',
        color: CSS.ACCENT_AMBER,
      })
      .setOrigin(0.5).setAlpha(0);

    const goal = gameStore.personalGoal;
    const completedLabel = this.add
      .text(cx, height * 0.30, `Всего троек: ${goal.completedCount}`, {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: CSS.ACCENT_OLIVE,
      })
      .setOrigin(0.5).setAlpha(0);

    const newTrioLabel = this.add
      .text(cx, height * 0.40, 'Новая тройка целей:', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: '#aaaaaa',
      })
      .setOrigin(0.5).setAlpha(0);

    const itemObjs: Phaser.GameObjects.Text[] = [];
    goal.catalogIds.forEach((catalogId, i) => {
      const entry = gameStore.getCatalogEntry(catalogId);
      const name = entry?.name ?? catalogId;
      const obj = this.add
        .text(cx, height * (0.48 + i * 0.09), `• ${name}`, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.MD * s)}px`,
          color: '#ffffff',
          wordWrap: { width: cx * 2 - Math.round(48 * s) },
          align: 'center',
        })
        .setOrigin(0.5).setAlpha(0);
      itemObjs.push(obj);
    });

    const btnY = height * 0.80;
    const btnW = Math.round(168 * s);
    const btnH = Math.round(48 * s);

    const btnBg = this.add
      .rectangle(cx, btnY, btnW, btnH, COLORS.BUTTON_PRIMARY)
      .setInteractive({ useHandCursor: true }).setAlpha(0);

    const btnLabel = this.add
      .text(cx, btnY, 'Отлично!', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: CSS.TEXT_LIGHT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: titleText, alpha: 1, duration: 400 });
    this.tweens.add({
      targets: [completedLabel, newTrioLabel, ...itemObjs, btnBg, btnLabel],
      alpha: 1, duration: 500, delay: 200,
    });

    btnBg.on('pointerup', () => this.scene.stop());
  }
}
