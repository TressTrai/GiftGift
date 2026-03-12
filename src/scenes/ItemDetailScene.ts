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
    const s = width / 390;

    // Затемнение
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();

    // Карточка
    const cardMargin = Math.round(24 * s);
    const cardW = width - 2 * cardMargin;
    const cardH = Math.round(360 * s);
    const cardX = cardMargin;
    const cardY = (height - cardH) / 2;

    this.add.rectangle(cardX, cardY, cardW, cardH, 0x1e1e3a).setOrigin(0);

    // Изображение подарка
    const imgSize = Math.round(120 * s);
    this.add
      .image(cardX + cardW / 2, cardY + Math.round(90 * s), entry?.imageKey ?? item.catalogId)
      .setDisplaySize(imgSize, imgSize);

    // Название
    this.add
      .text(cardX + cardW / 2, cardY + Math.round(164 * s), entry?.name ?? item.catalogId, {
        fontSize: `${Math.round(18 * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Описание
    this.add
      .text(cardX + cardW / 2, cardY + Math.round(200 * s), entry?.description ?? '', {
        fontSize: `${Math.round(14 * s)}px`,
        color: '#aaaaaa',
        wordWrap: { width: cardW - Math.round(32 * s) },
        align: 'center',
      })
      .setOrigin(0.5);

    // Если подарок — показываем от кого
    if (item.type === 'gift') {
      const fromText = item.isAnonymous ? 'Анонимный подарок' : `От: ${item.fromUserName ?? '?'}`;
      this.add
        .text(cardX + cardW / 2, cardY + Math.round(240 * s), fromText, {
          fontSize: `${Math.round(13 * s)}px`,
          color: item.isAnonymous ? '#888888' : '#87ceeb',
        })
        .setOrigin(0.5);

      if (item.message) {
        this.add
          .text(cardX + cardW / 2, cardY + Math.round(265 * s), `"${item.message}"`, {
            fontSize: `${Math.round(13 * s)}px`,
            color: '#cccccc',
            fontStyle: 'italic',
            wordWrap: { width: cardW - Math.round(32 * s) },
            align: 'center',
          })
          .setOrigin(0.5);
      }
    }

    // Кнопка "Подарить"
    const btnW = Math.round(200 * s);
    const btnH = Math.round(40 * s);
    const btnY = cardY + cardH - Math.round(28 * s);

    const btnBg = this.add
      .rectangle(cardX + cardW / 2, btnY, btnW, btnH, COLORS.PRIMARY)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cardX + cardW / 2, btnY, 'Подарить это', {
        fontSize: `${Math.round(16 * s)}px`,
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

    // Закрытие при переключении вкладки
    const onTabChanged = () => this.scene.stop();
    EventBus.on(EVENTS.TAB_CHANGED, onTabChanged);
    this.events.once('shutdown', () => EventBus.off(EVENTS.TAB_CHANGED, onTabChanged));
  }
}
