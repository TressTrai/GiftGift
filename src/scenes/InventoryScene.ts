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

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);
    this.add
      .text(width / 2, 20, 'Инвентарь', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    const scrollY = this.renderContent(width, height);

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

  private renderContent(w: number, _h: number): number {
    let y = 56;
    const TAB_BOTTOM = 64;

    // ── Тройка целей ───────────────────────────────────────────────────────
    y = this.renderTrioGoals(w, y);
    y += 16;

    // ── Новые подарки ──────────────────────────────────────────────────────
    const wrapped = gameStore.wrappedGifts;
    if (wrapped.length > 0) {
      y = this.renderWrappedSection(w, y, wrapped);
      y += 16;
    }

    // ── Мой инвентарь ──────────────────────────────────────────────────────
    y = this.renderInventorySection(w, y, gameStore.inventory);

    return y + TAB_BOTTOM;
  }

  private renderTrioGoals(w: number, startY: number): number {
    const goal = gameStore.personalGoal;
    const CARD_W = (w - 32 - 16) / 3;
    const CARD_H = 100;
    const y = startY;

    this.add
      .text(16, y, 'ТВОИ ЦЕЛИ:', { fontSize: '13px', color: '#aaaaaa' })
      .setOrigin(0);

    goal.catalogIds.forEach((catId, i) => {
      const x = 16 + i * (CARD_W + 8);
      const cardY = y + 22;

      this.add
        .rectangle(x, cardY, CARD_W, CARD_H, 0x222240)
        .setOrigin(0)
        .setStrokeStyle(1, goal.collected[i] ? COLORS.SUCCESS : 0x444466);

      const entry = gameStore.getCatalogEntry(catId);
      this.add.image(x + CARD_W / 2, cardY + 32, entry?.imageKey ?? catId).setDisplaySize(44, 44);

      this.add
        .text(x + CARD_W / 2, cardY + 78, entry?.name ?? catId, {
          fontSize: '10px',
          color: '#cccccc',
          wordWrap: { width: CARD_W - 8 },
          align: 'center',
        })
        .setOrigin(0.5, 1);

      if (goal.collected[i]) {
        this.add
          .text(x + CARD_W - 6, cardY + 4, '✓', {
            fontSize: '16px',
            color: '#4caf50',
          })
          .setOrigin(1, 0);
      }
    });

    return y + 22 + CARD_H + 8;
  }

  private renderWrappedSection(w: number, startY: number, gifts: WrappedGift[]): number {
    this.add.text(16, startY, `У ТЕБЯ ${gifts.length} НОВЫХ ПОДАРКОВ!`, {
      fontSize: '13px',
      color: '#ffb347',
    }).setOrigin(0);

    this.add.text(16, startY + 18, 'Интересно, что там?', {
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0);

    const CARD_SIZE = 72;
    const COLS = Math.floor((w - 32) / (CARD_SIZE + 8));
    let row = 0;

    gifts.forEach((g, i) => {
      const col = i % COLS;
      if (i > 0 && col === 0) row++;
      const x = 16 + col * (CARD_SIZE + 8);
      const y = startY + 44 + row * (CARD_SIZE + 8);

      const bg = this.add
        .rectangle(x, y, CARD_SIZE, CARD_SIZE, 0x222240)
        .setOrigin(0)
        .setStrokeStyle(1, COLORS.ACCENT_PINK)
        .setInteractive({ useHandCursor: true });

      this.add
        .image(x + CARD_SIZE / 2, y + CARD_SIZE / 2, 'wrapped-gift')
        .setDisplaySize(48, 48);

      bg.on('pointerup', () => {
        this.scene.launch(SCENE_KEYS.REVEAL, { instanceId: g.instanceId });
      });
    });

    const rows = Math.ceil(gifts.length / COLS);
    return startY + 44 + rows * (CARD_SIZE + 8);
  }

  private renderInventorySection(w: number, startY: number, items: InventoryItem[]): number {
    this.add.text(16, startY, 'МОЙ ИНВЕНТАРЬ:', {
      fontSize: '13px',
      color: '#aaaaaa',
    }).setOrigin(0);

    if (items.length === 0) {
      this.add.text(w / 2, startY + 40, 'Пока пусто', {
        fontSize: '14px',
        color: '#555577',
      }).setOrigin(0.5, 0);
      return startY + 80;
    }

    const CARD_W = 88;
    const CARD_H = 104;
    const GAP = 8;
    const COLS = Math.floor((w - 32 + GAP) / (CARD_W + GAP));
    let row = 0;

    items.forEach((item, i) => {
      const col = i % COLS;
      if (i > 0 && col === 0) row++;
      const x = 16 + col * (CARD_W + GAP);
      const y = startY + 24 + row * (CARD_H + GAP);

      const entry = gameStore.getCatalogEntry(item.catalogId);
      const borderColor = item.type === 'gift' ? COLORS.GIFT_BORDER : COLORS.ITEM_BORDER;

      const bg = this.add
        .rectangle(x, y, CARD_W, CARD_H, 0x1e1e36)
        .setOrigin(0)
        .setStrokeStyle(2, borderColor)
        .setInteractive({ useHandCursor: true });

      this.add
        .image(x + CARD_W / 2, y + 38, entry?.imageKey ?? item.catalogId)
        .setDisplaySize(52, 52);

      this.add
        .text(x + CARD_W / 2, y + 68, entry?.name ?? item.catalogId, {
          fontSize: '10px',
          color: '#cccccc',
          wordWrap: { width: CARD_W - 8 },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      bg.on('pointerup', () => {
        EventBus.emit(EVENTS.OPEN_DETAIL, { item });
        this.scene.launch(SCENE_KEYS.ITEM_DETAIL, { item });
      });
    });

    const rows = Math.ceil(items.length / COLS);
    return startY + 24 + rows * (CARD_H + GAP);
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
