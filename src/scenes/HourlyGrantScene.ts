import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, RADIUS } from '../utils/constants';
import { gameStore } from '../store/GameStore';
import { InventoryItem } from '../types';

interface HourlyGrantData {
  items: InventoryItem[];
}

export class HourlyGrantScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.HOURLY_GRANT });
  }

  create(data: HourlyGrantData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;
    const items = data?.items ?? gameStore.pendingHourlyItems;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive();

    const pad = Math.round(24 * s);
    const panelW = Math.round(318 * s);
    const rowH = Math.round(84 * s);
    const headerH = Math.round(116 * s);
    const btnH = Math.round(54 * s);
    const panelH = headerH + items.length * rowH + Math.round(16 * s) + btnH + Math.round(24 * s);
    const panelX = cx - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const r = Math.round(RADIUS.LG * s);

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.BG_CARD);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, r);
    panel.lineStyle(2, COLORS.ACCENT_AMBER);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, r);

    const iconY = panelY + Math.round(28 * s);
    this.add
      .text(cx, iconY, '⏰', { fontSize: `${Math.round(34 * s)}px` })
      .setOrigin(0.5, 0);

    this.add
      .text(cx, iconY + Math.round(46 * s), 'Подарок часа!', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XL * s)}px`,
        fontStyle: 'bold',
        color: CSS.ACCENT_AMBER,
      })
      .setOrigin(0.5, 0);

    const countLabel = items.length > 1
      ? `Ты получил ${items.length} предмета!`
      : 'Ты получил предмет!';
    this.add
      .text(cx, iconY + Math.round(80 * s), countLabel, {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: CSS.TEXT_DIM,
      })
      .setOrigin(0.5, 0);

    const imgSize = Math.round(54 * s);
    const textOffX = Math.round(36 * s);

    items.forEach((item, idx) => {
      const entry = gameStore.getCatalogEntry(item.catalogId);
      const rowY = panelY + headerH + idx * rowH;
      const rowCenterY = rowY + rowH / 2;

      if (idx > 0) {
        this.add
          .rectangle(cx, rowY, panelW - pad * 2, Math.round(1 * s), COLORS.DIVIDER)
          .setOrigin(0.5, 0);
      }

      this.add
        .image(panelX + pad + imgSize / 2, rowCenterY, entry?.imageKey ?? item.catalogId)
        .setDisplaySize(imgSize, imgSize);

      this.add
        .text(panelX + pad + imgSize + textOffX, rowCenterY - Math.round(12 * s), entry?.name ?? item.catalogId, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.MD * s)}px`,
          fontStyle: 'bold',
          color: CSS.TEXT,
          wordWrap: { width: panelW - pad * 2 - imgSize - textOffX },
        })
        .setOrigin(0, 0.5);

      if (entry?.description) {
        this.add
          .text(panelX + pad + imgSize + textOffX, rowCenterY + Math.round(14 * s), entry.description, {
            fontFamily: FONT.BODY,
            fontSize: `${Math.round(FS.XS * s)}px`,
            color: CSS.TEXT_DIM,
            wordWrap: { width: panelW - pad * 2 - imgSize - textOffX },
          })
          .setOrigin(0, 0);
      }
    });

    const btnY = panelY + headerH + items.length * rowH + Math.round(16 * s) + btnH / 2;
    const btnW = Math.round(186 * s);
    const btnR = Math.round(RADIUS.MD * s);

    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(COLORS.BUTTON_PRIMARY);
    btnGfx.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, btnR);
    btnGfx.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(cx - btnW / 2, btnY - btnH / 2, btnW, btnH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.add
      .text(cx, btnY, 'Отлично!', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.LG * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT_LIGHT,
      })
      .setOrigin(0.5);

    btnGfx.on('pointerup', () => {
      gameStore.clearPendingHourlyItems();
      this.scene.stop();
    });

    const panelObjects = this.children.list.slice(1);
    panelObjects.forEach(obj => {
      (obj as Phaser.GameObjects.GameObject & { setAlpha: (v: number) => void }).setAlpha?.(0);
    });
    this.tweens.add({ targets: panelObjects, alpha: 1, duration: 250, ease: 'Power1' });
  }
}
