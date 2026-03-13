import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, RADIUS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { InventoryItem, WrappedGift } from '../types';

export class InventoryScene extends Phaser.Scene {
  private didScroll = false;

  constructor() {
    super({ key: SCENE_KEYS.INVENTORY });
  }

  create(): void {
    const { width, height } = this.scale;
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0).setScrollFactor(0);
    this.add
      .text(width / 2, Math.round(20 * s), 'Инвентарь', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XL * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT,
      })
      .setOrigin(0.5, 0);

    const scrollY = this.renderContent(width, height, s);
    this.setupScroll(scrollY);

    const restart = () => this.scene.restart();
    EventBus.on(EVENTS.ITEM_COLLECTED, restart);
    EventBus.on(EVENTS.GIFT_SENT, restart);
    EventBus.on(EVENTS.GIFT_REVEALED, restart);
    EventBus.on(EVENTS.TRIO_COMPLETED, restart);
    EventBus.on(EVENTS.NEW_GIFTS_RECEIVED, restart);

    this.events.once('shutdown', () => {
      EventBus.off(EVENTS.ITEM_COLLECTED, restart);
      EventBus.off(EVENTS.GIFT_SENT, restart);
      EventBus.off(EVENTS.GIFT_REVEALED, restart);
      EventBus.off(EVENTS.TRIO_COMPLETED, restart);
      EventBus.off(EVENTS.NEW_GIFTS_RECEIVED, restart);
    });
  }

  private renderContent(w: number, _h: number, s: number): number {
    let y = Math.round(60 * s);
    const TAB_BOTTOM = Math.round(90 * s);
    const sectionGap = Math.round(16 * s);

    y = this.renderTrioGoals(w, y, s);
    y += sectionGap;

    const wrapped = gameStore.wrappedGifts;
    if (wrapped.length > 0) {
      y = this.renderWrappedSection(w, y, wrapped, s);
      y += sectionGap;
    }

    y = this.renderInventorySection(w, y, gameStore.inventory, s);
    return y + TAB_BOTTOM;
  }

  private renderTrioGoals(w: number, startY: number, s: number): number {
    const goal = gameStore.personalGoal;
    const pad   = Math.round(16 * s);
    const gap   = Math.round(8 * s);
    const CARD_W = (w - 2 * pad - 2 * gap) / 3;
    const CARD_H = Math.round(108 * s);
    const labelOffY = Math.round(24 * s);
    const imgSize   = Math.round(46 * s);
    const r = Math.round(RADIUS.MD * s);
    const y = startY;

    this.add
      .text(pad, y, 'ТВОИ ЦЕЛИ:', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT_DIM,
      })
      .setOrigin(0);

    goal.catalogIds.forEach((catId, i) => {
      const x = pad + i * (CARD_W + gap);
      const cardY = y + labelOffY;

      const g = this.add.graphics();
      g.fillStyle(COLORS.BG_CARD);
      g.fillRoundedRect(x, cardY, CARD_W, CARD_H, r);
      g.lineStyle(1.5, goal.collected[i] ? COLORS.SUCCESS : COLORS.ITEM_BORDER);
      g.strokeRoundedRect(x, cardY, CARD_W, CARD_H, r);

      const entry = gameStore.getCatalogEntry(catId);
      // Изображение — в верхней трети карточки
      this.add.image(x + CARD_W / 2, cardY + Math.round(CARD_H * 0.37), entry?.imageKey ?? catId)
        .setDisplaySize(imgSize, imgSize);

      // Название — с отступом ниже изображения
      this.add
        .text(x + CARD_W / 2, cardY + Math.round(CARD_H * 0.73), entry?.name ?? catId, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.XS * s)}px`,
          color: CSS.TEXT_DIM,
          wordWrap: { width: CARD_W - gap },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      if (goal.collected[i]) {
        this.add
          .text(x + CARD_W - Math.round(6 * s), cardY + Math.round(5 * s), '✓', {
            fontFamily: FONT.BODY,
            fontSize: `${Math.round(FS.MD * s)}px`,
            color: CSS.SUCCESS,
            fontStyle: 'bold',
          })
          .setOrigin(1, 0);
      }
    });

    return y + labelOffY + CARD_H + gap;
  }

  private renderWrappedSection(w: number, startY: number, gifts: WrappedGift[], s: number): number {
    const pad       = Math.round(16 * s);
    const gap       = Math.round(8 * s);
    const CARD_SIZE = Math.round(76 * s);
    const imgSize   = Math.round(50 * s);
    const headerH   = Math.round(48 * s);
    const r         = Math.round(RADIUS.MD * s);

    this.add.text(pad, startY, `У ТЕБЯ ${gifts.length} НОВЫХ ПОДАРКОВ!`, {
      fontFamily: FONT.BODY,
      fontSize: `${Math.round(FS.SM * s)}px`,
      fontStyle: 'bold',
      color: CSS.ACCENT_AMBER,
    }).setOrigin(0);

    this.add.text(pad, startY + Math.round(22 * s), 'Нажми, чтобы открыть', {
      fontFamily: FONT.BODY,
      fontSize: `${Math.round(FS.XS * s)}px`,
      color: CSS.TEXT_DIM,
    }).setOrigin(0);

    const COLS = Math.floor((w - 2 * pad) / (CARD_SIZE + gap));
    let row = 0;

    gifts.forEach((gift, i) => {
      const col = i % COLS;
      if (i > 0 && col === 0) row++;
      const x = pad + col * (CARD_SIZE + gap);
      const y = startY + headerH + row * (CARD_SIZE + gap);

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.BG_CARD);
      bg.fillRoundedRect(x, y, CARD_SIZE, CARD_SIZE, r);
      bg.lineStyle(2, COLORS.ACCENT_PINK);
      bg.strokeRoundedRect(x, y, CARD_SIZE, CARD_SIZE, r);
      bg.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(x, y, CARD_SIZE, CARD_SIZE),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

      this.add.image(x + CARD_SIZE / 2, y + CARD_SIZE / 2, 'wrapped-gift')
        .setDisplaySize(imgSize, imgSize);

      bg.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (this.didScroll || this.isTabBarArea(ptr.y)) return;
        this.scene.launch(SCENE_KEYS.REVEAL, { instanceId: gift.instanceId });
      });
    });

    const rows = Math.ceil(gifts.length / COLS);
    return startY + headerH + rows * (CARD_SIZE + gap);
  }

  private renderInventorySection(w: number, startY: number, items: InventoryItem[], s: number): number {
    const pad   = Math.round(16 * s);
    const gap   = Math.round(8 * s);
    const COLS  = Math.max(1, Math.floor((w - 2 * pad + gap) / (Math.round(88 * s) + gap)));
    const CARD_W = Math.floor((w - 2 * pad - (COLS - 1) * gap) / COLS);
    const CARD_H = Math.round(CARD_W * 1.18);
    const imgSize = Math.round(CARD_W * 0.55);
    const r     = Math.round(RADIUS.MD * s);

    this.add.text(pad, startY, 'МОЙ ИНВЕНТАРЬ:', {
      fontFamily: FONT.BODY,
      fontSize: `${Math.round(FS.SM * s)}px`,
      fontStyle: 'bold',
      color: CSS.TEXT_DIM,
    }).setOrigin(0);

    if (items.length === 0) {
      this.add.text(w / 2, startY + Math.round(44 * s), 'Пока пусто', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: CSS.TEXT_DIM,
      }).setOrigin(0.5, 0);
      return startY + Math.round(88 * s);
    }

    items.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = pad + col * (CARD_W + gap);
      const y = startY + Math.round(26 * s) + row * (CARD_H + gap);

      const entry = gameStore.getCatalogEntry(item.catalogId);
      const borderColor = item.type === 'gift' ? COLORS.GIFT_BORDER : COLORS.ITEM_BORDER;

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.BG_CARD);
      bg.fillRoundedRect(x, y, CARD_W, CARD_H, r);
      bg.lineStyle(2, borderColor);
      bg.strokeRoundedRect(x, y, CARD_W, CARD_H, r);
      bg.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(x, y, CARD_W, CARD_H),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

      // Изображение — в верхней части карточки
      this.add
        .image(x + CARD_W / 2, y + Math.round(CARD_H * 0.37), entry?.imageKey ?? item.catalogId)
        .setDisplaySize(imgSize, imgSize);

      // Иконка подарка в правом верхнем углу
      if (item.type === 'gift') {
        const badgeSize = Math.round(22 * s);
        const badgeOff  = Math.round(5 * s);
        this.add
          .image(x + CARD_W - badgeOff, y + badgeOff, 'wrapped-gift')
          .setDisplaySize(badgeSize, badgeSize)
          .setOrigin(1, 0);
      }

      // Название — с гарантированным отступом от изображения
      this.add
        .text(x + CARD_W / 2, y + Math.round(CARD_H * 0.73), entry?.name ?? item.catalogId, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.XS * s)}px`,
          color: CSS.TEXT_DIM,
          wordWrap: { width: CARD_W - gap },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      bg.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (this.didScroll || this.isTabBarArea(ptr.y)) return;
        EventBus.emit(EVENTS.OPEN_DETAIL, { item });
        this.scene.launch(SCENE_KEYS.ITEM_DETAIL, { item });
      });
    });

    const rows = Math.ceil(items.length / COLS);
    return startY + Math.round(26 * s) + rows * (CARD_H + gap);
  }

  private setupScroll(contentHeight: number): void {
    const { height } = this.scale;
    let startY = 0;
    let startScrollY = 0;
    const SCROLL_THRESHOLD = 6;

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      startY = ptr.y;
      startScrollY = this.cameras.main.scrollY;
      this.didScroll = false;
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      const delta = ptr.y - startY;
      if (Math.abs(delta) > SCROLL_THRESHOLD) this.didScroll = true;
      if (contentHeight <= height) return;
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        startScrollY - delta, 0, contentHeight - height,
      );
    });
  }

  private isTabBarArea(ptrY: number): boolean {
    const s = this.scale.width / 390;
    return ptrY > this.scale.height - Math.round(90 * s);
  }
}
