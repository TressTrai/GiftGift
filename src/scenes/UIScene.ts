import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';

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
    this.createTabBar(width, height);
    this.updateBadge();
    this.subscribeToEvents();
  }

  private createTabBar(w: number, h: number): void {
    const barH = 64;
    const y = h - barH / 2;

    // Фон таб-бара
    this.add.rectangle(0, h - barH, w, barH, 0x111122, 0.95).setOrigin(0);

    const tabs: { key: Tab; icon: string; label: string; x: number }[] = [
      { key: 'game',      icon: 'icon-scene',     label: 'Сцена',     x: w * 0.20 },
      { key: 'inventory', icon: 'icon-inventory',  label: 'Инвентарь', x: w * 0.50 },
      { key: 'profile',   icon: 'icon-profile',    label: 'Профиль',   x: w * 0.80 },
    ];

    tabs.forEach(tab => {
      const isActive = tab.key === this.activeTab;

      const icon = this.add
        .image(tab.x, y - 10, tab.icon)
        .setDisplaySize(28, 28)
        .setInteractive({ useHandCursor: true })
        .setTint(isActive ? COLORS.ACCENT_WARM : COLORS.TEXT_DIM);

      const label = this.add
        .text(tab.x, y + 14, tab.label, {
          fontSize: '11px',
          color: isActive ? '#ffb347' : '#888888',
        })
        .setOrigin(0.5);

      this.tabIcons.set(tab.key, icon);
      this.tabLabels.set(tab.key, label);

      icon.on('pointerup', () => this.switchTab(tab.key));
    });

    // Badge нераскрытых подарков (над иконкой инвентаря)
    this.badgeBg = this.add
      .circle(w * 0.50 + 16, y - 26, 10, 0xff4444)
      .setVisible(false);

    this.badgeText = this.add
      .text(w * 0.50 + 16, y - 26, '0', {
        fontSize: '11px',
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
  }
}
