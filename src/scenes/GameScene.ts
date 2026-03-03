import Phaser from 'phaser';
import { SCENE_KEYS, EVENTS, SPAWN_POINTS, SCENE_WIDTH, SCENE_HEIGHT, COLLECTIVE_VISUAL_STEPS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { collectItem } from '../api/game';
import { SceneItem, CollectiveGoal, InventoryItem } from '../types';

/**
 * GameScene — Tab 1: интерактивная сцена.
 * - Большая иллюстрация с pan/zoom
 * - Предметы на фиксированных точках (тапабельные)
 * - Визуальный прогресс коллективной цели (элементы добавляются каждые 10%)
 */
export class GameScene extends Phaser.Scene {
  private itemSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private progressElements: Phaser.GameObjects.Image[] = [];

  // Pan/zoom
  private isDragging = false;
  private dragStart = { x: 0, y: 0, camX: 0, camY: 0 };

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    // Большая сцена (1600×1200), камера свободно перемещается
    this.cameras.main.setBounds(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    this.add.image(0, 0, 'scene-bg').setOrigin(0);

    this.renderSceneItems(gameStore.sceneItems);
    this.updateCollectiveVisuals(gameStore.collectiveGoal);

    this.setupPanZoom();
    this.subscribeToEvents();
  }

  // ─── Рендер предметов ─────────────────────────────────────────────────────

  private renderSceneItems(items: SceneItem[]): void {
    // Убираем старые спрайты которых нет в новом списке
    const newIds = new Set(items.map(i => i.instanceId));
    this.itemSprites.forEach((sprite, id) => {
      if (!newIds.has(id)) {
        sprite.destroy();
        this.itemSprites.delete(id);
      }
    });

    // Добавляем новые
    items.forEach(item => {
      if (!this.itemSprites.has(item.instanceId)) {
        this.spawnItemSprite(item);
      }
    });
  }

  private spawnItemSprite(item: SceneItem): void {
    const point = SPAWN_POINTS[item.spawnPointIndex];
    const x = point.x * SCENE_WIDTH;
    const y = point.y * SCENE_HEIGHT;

    const s = this.scale.width / 390;
    const spriteSize = Math.round(56 * s);

    const catalog = this.getCatalog(item.catalogId);
    const sprite = this.add
      .image(x, y, catalog.imageKey)
      .setDisplaySize(spriteSize, spriteSize)
      .setInteractive({ useHandCursor: true });

    // Лёгкое свечение / пульсация чтобы отличались от декора
    this.tweens.add({
      targets: sprite,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    sprite.on('pointerup', () => this.handleCollect(item.instanceId, sprite));

    this.itemSprites.set(item.instanceId, sprite);
  }

  private async handleCollect(instanceId: string, sprite: Phaser.GameObjects.Image): Promise<void> {
    sprite.disableInteractive();

    // Запоминаем catalogId до API-запроса — после него предмет уйдёт из sceneItems
    const sceneItem = gameStore.sceneItems.find(i => i.instanceId === instanceId);

    try {
      const newSceneItems = await collectItem(instanceId);
      gameStore.applySceneItemsUpdate(newSceneItems);

      // Добавляем предмет в инвентарь
      if (sceneItem) {
        const inventoryItem: InventoryItem = {
          instanceId,
          catalogId: sceneItem.catalogId,
          type: 'item',
          receivedAt: new Date().toISOString(),
        };
        gameStore.applyItemCollected(instanceId, inventoryItem);
      }

      // Анимация сбора
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 250,
        onComplete: () => sprite.destroy(),
      });
      this.itemSprites.delete(instanceId);
      if (this.cache.audio.exists('sfx-collect')) this.sound.play('sfx-collect', { volume: 0.6 });
    } catch {
      // Race condition — предмет уже собран кем-то другим
      this.showRaceConditionFeedback(sprite.x, sprite.y);
      sprite.setAlpha(0.3);
      this.time.delayedCall(600, () => sprite.destroy());
      this.itemSprites.delete(instanceId);
    }
  }

  private showRaceConditionFeedback(x: number, y: number): void {
    const s = this.scale.width / 390;
    const txt = this.add
      .text(x, y - Math.round(30 * s), 'Уже собран!', {
        fontSize: `${Math.round(14 * s)}px`,
        color: '#ff6b6b',
        backgroundColor: '#00000088',
        padding: { x: Math.round(6 * s), y: Math.round(3 * s) },
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - Math.round(70 * s),
      alpha: 0,
      duration: 1200,
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Коллективный прогресс ───────────────────────────────────────────────

  private updateCollectiveVisuals(goal: CollectiveGoal): void {
    const pct = goal.target > 0 ? goal.current / goal.target : 0;
    const steps = Math.min(
      Math.floor(pct * COLLECTIVE_VISUAL_STEPS),
      COLLECTIVE_VISUAL_STEPS,
    );

    while (this.progressElements.length < steps) {
      const idx = this.progressElements.length + 1;
      const img = this.add.image(
        Phaser.Math.Between(100, SCENE_WIDTH - 100),
        Phaser.Math.Between(100, SCENE_HEIGHT - 100),
        `progress-el-${idx}`,
      ).setAlpha(0);

      this.tweens.add({ targets: img, alpha: 1, duration: 600 });
      this.progressElements.push(img);
    }
  }

  // ─── Pan/Zoom ────────────────────────────────────────────────────────────

  private setupPanZoom(): void {
    const cam = this.cameras.main;
    let pinchDist = 0;

    // Регистрируем второй указатель для мультитач
    this.input.addPointer(1);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const p2 = this.input.pointer2;
      if (p2.isDown) {
        // Второй палец опустился — начинаем pinch, отменяем pan
        this.isDragging = false;
        pinchDist = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          p2.x, p2.y,
        );
      } else {
        // Один палец — pan
        this.isDragging = true;
        this.dragStart = { x: ptr.x, y: ptr.y, camX: cam.scrollX, camY: cam.scrollY };
      }
    });

    this.input.on('pointermove', () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      if (p1.isDown && p2.isDown) {
        // Pinch zoom
        const newDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinchDist > 0) {
          cam.zoom = Phaser.Math.Clamp(cam.zoom * (newDist / pinchDist), 0.4, 2.0);
        }
        pinchDist = newDist;
      } else if (this.isDragging && p1.isDown) {
        cam.scrollX = this.dragStart.camX - (p1.x - this.dragStart.x);
        cam.scrollY = this.dragStart.camY - (p1.y - this.dragStart.y);
      }
    });

    this.input.on('pointerup', () => {
      pinchDist = 0;
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      // Один палец остался — переходим обратно в pan
      if (p1.isDown && !p2.isDown) {
        this.isDragging = true;
        this.dragStart = { x: p1.x, y: p1.y, camX: cam.scrollX, camY: cam.scrollY };
      } else if (!p1.isDown) {
        this.isDragging = false;
      }
    });

    // Колёсико мыши — для десктопа
    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.4, 2.0);
    });
  }

  // ─── События ─────────────────────────────────────────────────────────────

  private subscribeToEvents(): void {
    const onItemsUpdated = (items: SceneItem[]) => this.renderSceneItems(items);
    const onProgress = (goal: CollectiveGoal) => this.updateCollectiveVisuals(goal);
    const onFinale = () => this.scene.launch(SCENE_KEYS.FINALE);

    EventBus.on(EVENTS.SCENE_ITEMS_UPDATED, onItemsUpdated);
    EventBus.on(EVENTS.COLLECTIVE_PROGRESS, onProgress);
    EventBus.on(EVENTS.FINALE_TRIGGERED, onFinale);

    this.events.once('shutdown', () => {
      EventBus.off(EVENTS.SCENE_ITEMS_UPDATED, onItemsUpdated);
      EventBus.off(EVENTS.COLLECTIVE_PROGRESS, onProgress);
      EventBus.off(EVENTS.FINALE_TRIGGERED, onFinale);
    });
  }

  private getCatalog(catalogId: string) {
    return gameStore.getCatalogEntry(catalogId) ?? { imageKey: catalogId };
  }
}
