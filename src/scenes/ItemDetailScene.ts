import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, RADIUS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { InventoryItem } from '../types';
import { gameStore } from '../store/GameStore';

interface ItemDetailData {
  item: InventoryItem;
}

export class ItemDetailScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.ITEM_DETAIL });
  }

  create(data: ItemDetailData): void {
    const { width, height } = this.scale;
    const { item } = data;
    const entry = gameStore.getCatalogEntry(item.catalogId);
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();

    const cardMargin = Math.round(24 * s);
    const cardW = width - 2 * cardMargin;
    const cardH = Math.round(370 * s);
    const cardX = cardMargin;
    const cardY = (height - cardH) / 2;
    const r = Math.round(RADIUS.LG * s);

    const card = this.add.graphics();
    card.fillStyle(COLORS.BG_CARD);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, r);
    card.lineStyle(1.5, COLORS.DIVIDER);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, r);

    const imgSize = Math.round(120 * s);
    this.add
      .image(cardX + cardW / 2, cardY + Math.round(90 * s), entry?.imageKey ?? item.catalogId)
      .setDisplaySize(imgSize, imgSize);

    this.add
      .text(cardX + cardW / 2, cardY + Math.round(170 * s), entry?.name ?? item.catalogId, {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.LG * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT,
      })
      .setOrigin(0.5);

    this.add
      .text(cardX + cardW / 2, cardY + Math.round(212 * s), entry?.description ?? '', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: CSS.TEXT_DIM,
        wordWrap: { width: cardW - Math.round(32 * s) },
        align: 'center',
      })
      .setOrigin(0.5);

    if (item.type === 'gift') {
      const fromText = item.isAnonymous ? 'Анонимный подарок' : `От: ${item.fromUserName ?? '?'}`;
      this.add
        .text(cardX + cardW / 2, cardY + Math.round(258 * s), fromText, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.SM * s)}px`,
          color: item.isAnonymous ? CSS.TEXT_DIM : CSS.ACCENT_TEAL,
        })
        .setOrigin(0.5);

      if (item.message) {
        this.add
          .text(cardX + cardW / 2, cardY + Math.round(285 * s), `"${item.message}"`, {
            fontFamily: FONT.BODY,
            fontSize: `${Math.round(FS.SM * s)}px`,
            color: CSS.TEXT_DIM,
            fontStyle: 'italic',
            wordWrap: { width: cardW - Math.round(32 * s) },
            align: 'center',
          })
          .setOrigin(0.5);
      }
    }

    const btnW = Math.round(210 * s);
    const btnH = Math.round(46 * s);
    const btnY = cardY + cardH - Math.round(30 * s);
    const btnR = Math.round(RADIUS.MD * s);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.BUTTON_PRIMARY);
    btnBg.fillRoundedRect(cardX + cardW / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, btnR);
    btnBg.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(cardX + cardW / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.add
      .text(cardX + cardW / 2, btnY, 'Подарить это', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: CSS.TEXT_LIGHT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    btnBg.on('pointerup', () => {
      this.scene.stop();
      EventBus.emit(EVENTS.OPEN_GIFTING, { item });
      this.scene.launch(SCENE_KEYS.GIFTING, { item });
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const outsideCard =
        ptr.x < cardX || ptr.x > cardX + cardW ||
        ptr.y < cardY || ptr.y > cardY + cardH;
      if (outsideCard) this.scene.stop();
    });

    const onTabChanged = () => this.scene.stop();
    EventBus.on(EVENTS.TAB_CHANGED, onTabChanged);
    this.events.once('shutdown', () => EventBus.off(EVENTS.TAB_CHANGED, onTabChanged));
  }
}
