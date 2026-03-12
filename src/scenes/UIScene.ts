import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { InventoryItem } from '../types';

type Tab = 'game' | 'inventory' | 'profile';

/**
 * UIScene — постоянный оверлей поверх GameScene.
 * Содержит: Tab Bar (нижняя навигация) + badge на инвентаре.
 * Запускается параллельно с GameScene (layered scenes pattern).
 */
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
    this.activeTab = 'game'; // сбрасываем при каждом запуске сцены
    this.tabIcons.clear();
    this.tabLabels.clear();
    this.createTabBar(width, height);
    this.updateBadge();
    this.subscribeToEvents();
  }

  private createTabBar(w: number, h: number): void {
    const s = w / 390;
    const barH = Math.round(64 * s);
    const y = h - barH / 2;

    // Фон таб-бара
    this.add.rectangle(0, h - barH, w, barH, 0x111122, 0.95).setOrigin(0);

    const tabs: { key: Tab; icon: string; label: string; x: number }[] = [
      { key: 'game',      icon: 'icon-scene',     label: 'Сцена',     x: w * 0.20 },
      { key: 'inventory', icon: 'icon-inventory',  label: 'Инвентарь', x: w * 0.50 },
      { key: 'profile',   icon: 'icon-profile',    label: 'Профиль',   x: w * 0.80 },
    ];

    const iconSize  = Math.round(28 * s);
    const iconOffY  = Math.round(10 * s);
    const labelOffY = Math.round(14 * s);
    const fontSize  = Math.round(11 * s);

    tabs.forEach(tab => {
      const isActive = tab.key === this.activeTab;

      const icon = this.add
        .image(tab.x, y - iconOffY, tab.icon)
        .setDisplaySize(iconSize, iconSize)
        .setInteractive({ useHandCursor: true })
        .setTint(isActive ? COLORS.ACCENT_WARM : COLORS.TEXT_DIM);

      const label = this.add
        .text(tab.x, y + labelOffY, tab.label, {
          fontSize: `${fontSize}px`,
          color: isActive ? '#ffb347' : '#888888',
        })
        .setOrigin(0.5);

      this.tabIcons.set(tab.key, icon);
      this.tabLabels.set(tab.key, label);

      icon.on('pointerup', () => this.switchTab(tab.key));
    });

    // Badge нераскрытых подарков (над иконкой инвентаря)
    const badgeR    = Math.round(10 * s);
    const badgeOffX = Math.round(16 * s);
    const badgeOffY = Math.round(26 * s);

    this.badgeBg = this.add
      .circle(w * 0.50 + badgeOffX, y - badgeOffY, badgeR, 0xff4444)
      .setVisible(false);

    this.badgeText = this.add
      .text(w * 0.50 + badgeOffX, y - badgeOffY, '0', {
        fontSize: `${Math.round(11 * s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private switchTab(tab: Tab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;

    // Обновляем внешний вид таб-бара
    this.tabIcons.forEach((icon, key) => {
      icon.setTint(key === tab ? COLORS.ACCENT_WARM : COLORS.TEXT_DIM);
    });
    this.tabLabels.forEach((label, key) => {
      label.setColor(key === tab ? '#ffb347' : '#888888');
    });

    // Останавливаем предыдущие secondary сцены
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
    EventBus.on(EVENTS.HOURLY_ITEMS_RECEIVED, (items: InventoryItem[]) => {
      this.showHourlyGrant(items);
    });

    // Предметы могли прийти в BootScene до старта UIScene — показываем сразу
    if (gameStore.pendingHourlyItems.length > 0) {
      this.showHourlyGrant(gameStore.pendingHourlyItems);
    }
  }

  private showHourlyGrant(items: InventoryItem[]): void {
    this.scene.launch(SCENE_KEYS.HOURLY_GRANT, { items });
    this.scene.bringToTop(SCENE_KEYS.HOURLY_GRANT);
  }
}
