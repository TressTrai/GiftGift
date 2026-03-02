import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { InventoryItem } from '../types';
import { gameStore } from '../store/GameStore';

interface ItemDetailData {
  item: InventoryItem;
}

/**
 * ItemDetailScene — модальный просмотр предмета/подарка.
 * Открывается поверх активной сцены (launch, не start).
 * Содержит: картинка, описание, от кого (подарок), кнопка "Подарить это".
 */
export class ItemDetailScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.ITEM_DETAIL });
  }

  create(data: ItemDetailData): void {
    const { width, height } = this.scale;
    const { item } = data;
    const entry = gameStore.getCatalogEntry(item.catalogId);

    // Затемнение
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();

    // Карточка
    const cardW = width - 48;
    const cardH = 360;
    const cardX = 24;
    const cardY = (height - cardH) / 2;

    this.add.rectangle(cardX, cardY, cardW, cardH, 0x1e1e3a).setOrigin(0);

    // Изображение подарка
    this.add
      .image(cardX + cardW / 2, cardY + 90, entry?.imageKey ?? item.catalogId)
      .setDisplaySize(120, 120);

    // Название
    this.add
      .text(cardX + cardW / 2, cardY + 164, entry?.name ?? item.catalogId, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Описание
    this.add
      .text(cardX + cardW / 2, cardY + 200, entry?.description ?? '', {
        fontSize: '14px',
        color: '#aaaaaa',
        wordWrap: { width: cardW - 32 },
        align: 'center',
      })
      .setOrigin(0.5);

    // Если подарок — показываем от кого
    if (item.type === 'gift') {
      const fromText = item.isAnonymous ? 'Анонимный подарок' : `От: ${item.fromUserName ?? '?'}`;
      this.add
        .text(cardX + cardW / 2, cardY + 240, fromText, {
          fontSize: '13px',
          color: item.isAnonymous ? '#888888' : '#87ceeb',
        })
        .setOrigin(0.5);

      if (item.message) {
        this.add
          .text(cardX + cardW / 2, cardY + 265, `"${item.message}"`, {
            fontSize: '13px',
            color: '#cccccc',
            fontStyle: 'italic',
            wordWrap: { width: cardW - 32 },
            align: 'center',
          })
          .setOrigin(0.5);
      }
    }

    // Кнопка "Подарить"
    const btnBg = this.add
      .rectangle(cardX + cardW / 2, cardY + cardH - 28, 200, 40, COLORS.PRIMARY)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cardX + cardW / 2, cardY + cardH - 28, 'Подарить это', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    btnBg.on('pointerup', () => {
      this.scene.stop();
      EventBus.emit(EVENTS.OPEN_GIFTING, { item });
      this.scene.launch(SCENE_KEYS.GIFTING, { item });
    });

    // Закрытие по тапу вне карточки
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const outsideCard =
        ptr.x < cardX || ptr.x > cardX + cardW ||
        ptr.y < cardY || ptr.y > cardY + cardH;
      if (outsideCard) this.scene.stop();
    });
  }
}
