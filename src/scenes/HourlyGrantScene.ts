import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '../utils/constants';
import { gameStore } from '../store/GameStore';
import { InventoryItem } from '../types';

interface HourlyGrantData {
  items: InventoryItem[];
}

/**
 * HourlyGrantScene — попап уведомления о часовом предмете.
 * Показывается когда сервер вернул newHourlyItems при синхронизации.
 */
export class HourlyGrantScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.HOURLY_GRANT });
  }

  create(data: HourlyGrantData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;
    const items = data?.items ?? gameStore.pendingHourlyItems;

    // Затемнение
    this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0).setInteractive();

    // Размеры панели
    const pad = Math.round(24 * s);
    const panelW = Math.round(310 * s);
    const rowH = Math.round(80 * s);
    const headerH = Math.round(110 * s);
    const btnH = Math.round(52 * s);
    const panelH = headerH + items.length * rowH + Math.round(16 * s) + btnH + Math.round(24 * s);
    const panelX = cx - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    // Фон панели
    this.add
      .rectangle(cx, height / 2, panelW, panelH, 0x1a1a3e)
      .setStrokeStyle(Math.round(2 * s), COLORS.ACCENT_WARM);

    // Иконка часов
    const iconY = panelY + Math.round(28 * s);
    this.add
      .text(cx, iconY, '⏰', {
        fontSize: `${Math.round(32 * s)}px`,
      })
      .setOrigin(0.5, 0);

    // Заголовок
    this.add
      .text(cx, iconY + Math.round(44 * s), 'Подарок часа!', {
        fontSize: `${Math.round(20 * s)}px`,
        fontStyle: 'bold',
        color: '#ffb347',
      })
      .setOrigin(0.5, 0);

    // Подзаголовок
    const countLabel = items.length > 1
      ? `Ты получил${items.length === 1 ? '' : 'а'} ${items.length} предмета!`
      : 'Ты получил предмет!';
    this.add
      .text(cx, iconY + Math.round(76 * s), countLabel, {
        fontSize: `${Math.round(13 * s)}px`,
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0);

    // Список предметов
    const imgSize = Math.round(52 * s);
    const textOffX = Math.round(36 * s);

    items.forEach((item, idx) => {
      const entry = gameStore.getCatalogEntry(item.catalogId);
      const rowY = panelY + headerH + idx * rowH;
      const rowCenterY = rowY + rowH / 2;

      // Разделитель (кроме первого)
      if (idx > 0) {
        this.add
          .rectangle(cx, rowY, panelW - pad * 2, 1, 0x333355)
          .setOrigin(0.5, 0);
      }

      // Картинка
      this.add
        .image(panelX + pad + imgSize / 2, rowCenterY, entry?.imageKey ?? item.catalogId)
        .setDisplaySize(imgSize, imgSize);

      // Название
      this.add
        .text(panelX + pad + imgSize + textOffX, rowCenterY - Math.round(12 * s), entry?.name ?? item.catalogId, {
          fontSize: `${Math.round(15 * s)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          wordWrap: { width: panelW - pad * 2 - imgSize - textOffX },
        })
        .setOrigin(0, 0.5);

      // Описание
      if (entry?.description) {
        this.add
          .text(panelX + pad + imgSize + textOffX, rowCenterY + Math.round(14 * s), entry.description, {
            fontSize: `${Math.round(11 * s)}px`,
            color: '#888888',
            wordWrap: { width: panelW - pad * 2 - imgSize - textOffX },
          })
          .setOrigin(0, 0);
      }
    });

    // Кнопка «Отлично!»
    const btnY = panelY + headerH + items.length * rowH + Math.round(16 * s) + btnH / 2;
    const btnW = Math.round(180 * s);

    const btn = this.add
      .rectangle(cx, btnY, btnW, btnH, COLORS.PRIMARY)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx, btnY, 'Отлично!', {
        fontSize: `${Math.round(17 * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    btn.on('pointerup', () => {
      gameStore.clearPendingHourlyItems();
      this.scene.stop();
    });

    // Fade-in панели
    const panelObjects = this.children.list.slice(1); // всё кроме затемнения
    panelObjects.forEach(obj => {
      (obj as Phaser.GameObjects.GameObject & { setAlpha: (v: number) => void }).setAlpha?.(0);
    });
    this.tweens.add({
      targets: panelObjects,
      alpha: 1,
      duration: 250,
      ease: 'Power1',
    });
  }
}
