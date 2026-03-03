import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { InventoryItem, WrappedGift } from '../types';

/**
 * InventoryScene — Tab 2: Инвентарь.
 * Три секции (сверху вниз):
 *   1. Личная тройка целей
 *   2. Новые подарки (нераскрытые)
 *   3. Мой инвентарь (предметы + подарки)
 */
export class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.INVENTORY });
  }

  create(): void {
    const { width, height } = this.scale;
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);
    this.add
      .text(width / 2, Math.round(20 * s), 'Инвентарь', {
        fontSize: `${Math.round(20 * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    const scrollY = this.renderContent(width, height, s);

    // Поддержка скролла (drag по вертикали)
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
    let y = Math.round(56 * s);
    const TAB_BOTTOM = Math.round(64 * s);
    const sectionGap = Math.round(16 * s);

    // ── Тройка целей ───────────────────────────────────────────────────────
    y = this.renderTrioGoals(w, y, s);
    y += sectionGap;

    // ── Новые подарки ──────────────────────────────────────────────────────
    const wrapped = gameStore.wrappedGifts;
    if (wrapped.length > 0) {
      y = this.renderWrappedSection(w, y, wrapped, s);
      y += sectionGap;
    }

    // ── Мой инвентарь ──────────────────────────────────────────────────────
    y = this.renderInventorySection(w, y, gameStore.inventory, s);

    return y + TAB_BOTTOM;
  }

  private renderTrioGoals(w: number, startY: number, s: number): number {
    const goal = gameStore.personalGoal;
    const pad   = Math.round(16 * s);
    const gap   = Math.round(8 * s);
    const CARD_W = (w - 2 * pad - 2 * gap) / 3;
    const CARD_H = Math.round(100 * s);
    const labelOffY = Math.round(22 * s);
    const imgY      = Math.round(32 * s);
    const textY     = Math.round(78 * s);
    const imgSize   = Math.round(44 * s);
    const y = startY;

    this.add
      .text(pad, y, 'ТВОИ ЦЕЛИ:', { fontSize: `${Math.round(13 * s)}px`, color: '#aaaaaa' })
      .setOrigin(0);

    goal.catalogIds.forEach((catId, i) => {
      const x = pad + i * (CARD_W + gap);
      const cardY = y + labelOffY;

      this.add
        .rectangle(x, cardY, CARD_W, CARD_H, 0x222240)
        .setOrigin(0)
        .setStrokeStyle(1, goal.collected[i] ? COLORS.SUCCESS : 0x444466);

      const entry = gameStore.getCatalogEntry(catId);
      this.add.image(x + CARD_W / 2, cardY + imgY, entry?.imageKey ?? catId).setDisplaySize(imgSize, imgSize);

      this.add
        .text(x + CARD_W / 2, cardY + textY, entry?.name ?? catId, {
          fontSize: `${Math.round(10 * s)}px`,
          color: '#cccccc',
          wordWrap: { width: CARD_W - gap },
          align: 'center',
        })
        .setOrigin(0.5, 1);

      if (goal.collected[i]) {
        this.add
          .text(x + CARD_W - Math.round(6 * s), cardY + Math.round(4 * s), '✓', {
            fontSize: `${Math.round(16 * s)}px`,
            color: '#4caf50',
          })
          .setOrigin(1, 0);
      }
    });

    return y + labelOffY + CARD_H + gap;
  }

  private renderWrappedSection(w: number, startY: number, gifts: WrappedGift[], s: number): number {
    const pad      = Math.round(16 * s);
    const gap      = Math.round(8 * s);
    const CARD_SIZE = Math.round(72 * s);
    const imgSize  = Math.round(48 * s);
    const headerH  = Math.round(44 * s);

    this.add.text(pad, startY, `У ТЕБЯ ${gifts.length} НОВЫХ ПОДАРКОВ!`, {
      fontSize: `${Math.round(13 * s)}px`,
      color: '#ffb347',
    }).setOrigin(0);

    this.add.text(pad, startY + Math.round(18 * s), 'Интересно, что там?', {
      fontSize: `${Math.round(12 * s)}px`,
      color: '#888888',
    }).setOrigin(0);

    const COLS = Math.floor((w - 2 * pad) / (CARD_SIZE + gap));
    let row = 0;

    gifts.forEach((g, i) => {
      const col = i % COLS;
      if (i > 0 && col === 0) row++;
      const x = pad + col * (CARD_SIZE + gap);
      const y = startY + headerH + row * (CARD_SIZE + gap);

      const bg = this.add
        .rectangle(x, y, CARD_SIZE, CARD_SIZE, 0x222240)
        .setOrigin(0)
        .setStrokeStyle(1, COLORS.ACCENT_PINK)
        .setInteractive({ useHandCursor: true });

      this.add
        .image(x + CARD_SIZE / 2, y + CARD_SIZE / 2, 'wrapped-gift')
        .setDisplaySize(imgSize, imgSize);

      bg.on('pointerup', () => {
        this.scene.launch(SCENE_KEYS.REVEAL, { instanceId: g.instanceId });
      });
    });

    const rows = Math.ceil(gifts.length / COLS);
    return startY + headerH + rows * (CARD_SIZE + gap);
  }

  private renderInventorySection(w: number, startY: number, items: InventoryItem[], s: number): number {
    const pad    = Math.round(16 * s);
    const gap    = Math.round(8 * s);
    const CARD_W = Math.round(88 * s);
    const CARD_H = Math.round(104 * s);
    const imgSize = Math.round(52 * s);

    this.add.text(pad, startY, 'МОЙ ИНВЕНТАРЬ:', {
      fontSize: `${Math.round(13 * s)}px`,
      color: '#aaaaaa',
    }).setOrigin(0);

    if (items.length === 0) {
      this.add.text(w / 2, startY + Math.round(40 * s), 'Пока пусто', {
        fontSize: `${Math.round(14 * s)}px`,
        color: '#555577',
      }).setOrigin(0.5, 0);
      return startY + Math.round(80 * s);
    }

    const COLS = Math.floor((w - 2 * pad + gap) / (CARD_W + gap));

    items.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = pad + col * (CARD_W + gap);
      const y = startY + Math.round(24 * s) + row * (CARD_H + gap);

      const entry = gameStore.getCatalogEntry(item.catalogId);
      const borderColor = item.type === 'gift' ? COLORS.GIFT_BORDER : COLORS.ITEM_BORDER;

      const bg = this.add
        .rectangle(x, y, CARD_W, CARD_H, 0x1e1e36)
        .setOrigin(0)
        .setStrokeStyle(2, borderColor)
        .setInteractive({ useHandCursor: true });

      this.add
        .image(x + CARD_W / 2, y + Math.round(38 * s), entry?.imageKey ?? item.catalogId)
        .setDisplaySize(imgSize, imgSize);

      this.add
        .text(x + CARD_W / 2, y + Math.round(68 * s), entry?.name ?? item.catalogId, {
          fontSize: `${Math.round(10 * s)}px`,
          color: '#cccccc',
          wordWrap: { width: CARD_W - gap },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      bg.on('pointerup', () => {
        EventBus.emit(EVENTS.OPEN_DETAIL, { item });
        this.scene.launch(SCENE_KEYS.ITEM_DETAIL, { item });
      });
    });

    const rows = Math.ceil(items.length / COLS);
    return startY + Math.round(24 * s) + rows * (CARD_H + gap);
  }

  private setupScroll(contentHeight: number): void {
    const { height } = this.scale;
    if (contentHeight <= height) return;

    let startY = 0;
    let startScrollY = 0;

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      startY = ptr.y;
      startScrollY = this.cameras.main.scrollY;
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        startScrollY - (ptr.y - startY),
        0,
        contentHeight - height,
      );
    });
  }
}
