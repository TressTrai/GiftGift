import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { InventoryItem } from '../types';

type Tab = 'game' | 'inventory' | 'profile';

export class UIScene extends Phaser.Scene {
  private activeTab: Tab = 'game';
  private badgeText!: Phaser.GameObjects.Text;
  private badgeBg!: Phaser.GameObjects.Arc;
  private tabIcons: Map<Tab, Phaser.GameObjects.Image> = new Map();
  private tabLabels: Map<Tab, Phaser.GameObjects.Text> = new Map();

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create(): void {
    const { width, height } = this.scale;
    this.activeTab = 'game';
    this.tabIcons.clear();
    this.tabLabels.clear();
    this.createTabBar(width, height);
    this.updateBadge();
    this.subscribeToEvents();
  }

  private createTabBar(w: number, h: number): void {
    const s = w / 390;
    const barH = Math.round(90 * s);
    const y = h - barH / 2;

    this.add.rectangle(0, h - barH, w, barH, COLORS.BG, 0.97).setOrigin(0);
    this.add.rectangle(0, h - barH, w, Math.round(1.5 * s), COLORS.DIVIDER).setOrigin(0);

    const tabs: { key: Tab; icon: string; label: string; x: number }[] = [
      { key: 'game',      icon: 'icon-scene',    label: 'Сцена',     x: w * 0.20 },
      { key: 'inventory', icon: 'icon-inventory', label: 'Инвентарь', x: w * 0.50 },
      { key: 'profile',   icon: 'icon-profile',   label: 'Профиль',   x: w * 0.80 },
    ];

    const iconSize  = Math.round(28 * s);
    const iconOffY  = Math.round(10 * s);
    const labelOffY = Math.round(14 * s);

    tabs.forEach(tab => {
      const isActive = tab.key === this.activeTab;

      const icon = this.add
        .image(tab.x, y - iconOffY, tab.icon)
        .setDisplaySize(iconSize, iconSize)
        .setInteractive({ useHandCursor: true })
        .setTint(isActive ? COLORS.ACCENT_AMBER : 0xc8b49a);

      const label = this.add
        .text(tab.x, y + labelOffY, tab.label, {
          fontFamily: FONT.BODY,
          fontSize: `${Math.round(FS.XS * s)}px`,
          color: isActive ? CSS.ACCENT_AMBER : CSS.TEXT_DIM,
        })
        .setOrigin(0.5);

      this.tabIcons.set(tab.key, icon);
      this.tabLabels.set(tab.key, label);
      icon.on('pointerup', () => this.switchTab(tab.key));
    });

    const badgeR    = Math.round(10 * s);
    const badgeOffX = Math.round(16 * s);
    const badgeOffY = Math.round(26 * s);

    this.badgeBg = this.add
      .circle(w * 0.50 + badgeOffX, y - badgeOffY, badgeR, COLORS.BADGE)
      .setVisible(false);

    this.badgeText = this.add
      .text(w * 0.50 + badgeOffX, y - badgeOffY, '0', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.XS * s)}px`,
        color: CSS.TEXT_LIGHT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private switchTab(tab: Tab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;

    this.tabIcons.forEach((icon, key) => {
      icon.setTint(key === tab ? COLORS.ACCENT_AMBER : 0xc8b49a);
    });
    this.tabLabels.forEach((label, key) => {
      label.setColor(key === tab ? CSS.ACCENT_AMBER : CSS.TEXT_DIM);
    });

    [SCENE_KEYS.INVENTORY, SCENE_KEYS.PROFILE].forEach(k => {
      if (this.scene.isActive(k)) this.scene.stop(k);
    });

    if (tab === 'game') {
      if (this.scene.isSleeping(SCENE_KEYS.GAME)) {
        this.scene.wake(SCENE_KEYS.GAME);
      } else if (!this.scene.isActive(SCENE_KEYS.GAME)) {
        this.scene.launch(SCENE_KEYS.GAME);
      }
    } else if (tab === 'inventory') {
      if (this.scene.isActive(SCENE_KEYS.GAME)) this.scene.sleep(SCENE_KEYS.GAME);
      this.scene.launch(SCENE_KEYS.INVENTORY);
      this.scene.bringToTop(SCENE_KEYS.UI);
    } else if (tab === 'profile') {
      if (this.scene.isActive(SCENE_KEYS.GAME)) this.scene.sleep(SCENE_KEYS.GAME);
      this.scene.launch(SCENE_KEYS.PROFILE);
      this.scene.bringToTop(SCENE_KEYS.UI);
    }

    EventBus.emit(EVENTS.TAB_CHANGED, tab);
  }

  private updateBadge(): void {
    const count = gameStore.wrappedGifts.length;
    const visible = count > 0;
    this.badgeBg.setVisible(visible);
    this.badgeText.setVisible(visible).setText(String(count));
  }

  private subscribeToEvents(): void {
    EventBus.on(EVENTS.NEW_GIFTS_RECEIVED, () => this.updateBadge());
    EventBus.on(EVENTS.GIFT_REVEALED, () => this.updateBadge());
    EventBus.on(EVENTS.STATE_SYNCED, () => this.updateBadge());
    EventBus.on(EVENTS.HOURLY_ITEMS_RECEIVED, (items: InventoryItem[]) => {
      this.showHourlyGrant(items);
    });
    if (gameStore.pendingHourlyItems.length > 0) {
      this.showHourlyGrant(gameStore.pendingHourlyItems);
    }
  }

  private showHourlyGrant(items: InventoryItem[]): void {
    this.scene.launch(SCENE_KEYS.HOURLY_GRANT, { items });
    this.scene.bringToTop(SCENE_KEYS.HOURLY_GRANT);
  }
}
