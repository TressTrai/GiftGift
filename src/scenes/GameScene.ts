import Phaser from 'phaser';
import { SCENE_KEYS, EVENTS, SPAWN_POINTS, SCENE_WIDTH, SCENE_HEIGHT, COLLECTIVE_VISUAL_STEPS, PROGRESS_POSITIONS, PROGRESS_IMAGES, COLORS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { collectItem } from '../api/game';
import { SceneItem, CollectiveGoal, InventoryItem, GameState } from '../types';
import { syncSystem } from '../systems/SyncSystem';

/**
 * GameScene — Tab 1: интерактивная сцена.
 * - Большая иллюстрация с pan/zoom
 * - Предметы на фиксированных точках (тапабельные)
 * - Визуальный прогресс коллективной цели (элементы добавляются каждые 10%)
 */
export class GameScene extends Phaser.Scene {
  private itemSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private progressElements: Phaser.GameObjects.Image[] = [];
  private collectingIds: Set<string> = new Set();

  // Pan/zoom
  private isDragging = false;
  private dragStart = { x: 0, y: 0, camX: 0, camY: 0 };

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    // Сбрасываем состояние при каждом запуске (Phaser переиспользует экземпляр)
    this.itemSprites.clear();
    this.progressElements = [];
    this.collectingIds.clear();

    // Большая сцена (2160×4800), камера свободно перемещается
    this.cameras.main.setBounds(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    this.add.image(0, 0, 'scene-bg').setOrigin(0);

    this.renderSceneItems(gameStore.sceneItems);
    this.updateCollectiveVisuals(gameStore.collectiveGoal);

    this.setupPanZoom();
    this.subscribeToEvents();
    syncSystem.start();
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

    // Добавляем новые (пропускаем те что сейчас в процессе сбора)
    items.forEach(item => {
      if (!this.itemSprites.has(item.instanceId) && !this.collectingIds.has(item.instanceId)) {
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

    // Лёгкая пульсация относительно текущего масштаба (+3%)
    const baseScale = sprite.scaleX;
    this.tweens.add({
      targets: sprite,
      scaleX: baseScale * 1.09,
      scaleY: baseScale * 1.09,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    sprite.once('pointerup', () => this.handleCollect(item.instanceId, sprite));

    this.itemSprites.set(item.instanceId, sprite);
  }

  private async handleCollect(instanceId: string, sprite: Phaser.GameObjects.Image): Promise<void> {
    if (this.collectingIds.has(instanceId)) return;
    this.collectingIds.add(instanceId);
    sprite.disableInteractive();

    // Запоминаем catalogId до API-запроса — после него предмет уйдёт из sceneItems
    const sceneItem = gameStore.sceneItems.find(i => i.instanceId === instanceId);

    try {
      const newSceneItems = await collectItem(instanceId);

      // Удаляем из Map ДО emit-а события — иначе renderSceneItems уничтожит спрайт
      this.itemSprites.delete(instanceId);
      this.collectingIds.delete(instanceId);

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

      // Партиклы и анимация сбора
      this.spawnCollectParticles(sprite.x, sprite.y);
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scaleX: sprite.scaleX * 1.15,
        scaleY: sprite.scaleY * 1.15,
        duration: 300,
        ease: 'Power1',
        onComplete: () => sprite.destroy(),
      });
      if (this.cache.audio.exists('sfx-collect')) this.sound.play('sfx-collect', { volume: 0.6 });
    } catch (e: unknown) {
      this.itemSprites.delete(instanceId);
      this.collectingIds.delete(instanceId);

      const status = (e as { status?: number }).status;
      if (status === 409) {
        // Настоящий race condition — предмет уже собран другим игроком
        this.showRaceConditionFeedback(sprite.x, sprite.y);
      }
      // При любой другой ошибке — тихо убираем спрайт
      sprite.setAlpha(0.3);
      this.time.delayedCall(600, () => sprite.destroy());
    }
  }

  private spawnCollectParticles(x: number, y: number): void {
    const colors = [COLORS.ACCENT_WARM, COLORS.ACCENT_PINK, COLORS.ACCENT_BLUE, COLORS.SUCCESS];
    const s = this.scale.width / 390;
    const r = Math.round(10 * s);
    const dist = Math.round(80 * s);

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const color = colors[i % colors.length];
      const p = this.add.circle(x, y, r, color);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 600,
        ease: 'Power1',
        onComplete: () => p.destroy(),
      });
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
      const idx = this.progressElements.length;
      const pos = PROGRESS_POSITIONS[idx];
      const img = this.add.image(
        pos.x * SCENE_WIDTH,
        pos.y * SCENE_HEIGHT,
        PROGRESS_IMAGES[idx],
      ).setAlpha(0);

      this.tweens.add({ targets: img, alpha: 1, duration: 600 });
      this.progressElements.push(img);
    }
  }

  // ─── Pan/Zoom ────────────────────────────────────────────────────────────

  private setupPanZoom(): void {
    const cam = this.cameras.main;
    // zoom=1.0 → видна ровно половина сцены (1080×2400 из 2160×4800)
    const MIN_ZOOM = 1.0;
    const MAX_ZOOM = 2.5;
    let pinchDist = 0;

    // Регистрируем второй указатель для мультитач
    this.input.addPointer(1);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const p2 = this.input.pointer2;
      if (p2.isDown) {
        // Второй палец — начинаем pinch, отменяем pan
        this.isDragging = false;
        pinchDist = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          p2.x, p2.y,
        );
      } else {
        // Один указатель (палец или мышь) — pan
        this.isDragging = true;
        this.dragStart = { x: ptr.x, y: ptr.y, camX: cam.scrollX, camY: cam.scrollY };
      }
    });

    // ptr — указатель, который двигается (мышь или палец)
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      if (p1.isDown && p2.isDown) {
        // Pinch zoom (два пальца)
        const newDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinchDist > 0) {
          cam.zoom = Phaser.Math.Clamp(cam.zoom * (newDist / pinchDist), MIN_ZOOM, MAX_ZOOM);
        }
        pinchDist = newDist;
      } else if (this.isDragging && ptr.isDown) {
        // Pan — делим на zoom чтобы скорость не зависела от масштаба
        cam.scrollX = this.dragStart.camX - (ptr.x - this.dragStart.x) / cam.zoom;
        cam.scrollY = this.dragStart.camY - (ptr.y - this.dragStart.y) / cam.zoom;
      }
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      pinchDist = 0;
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && !p2.isDown) {
        // Один палец остался после pinch — переходим обратно в pan
        this.isDragging = true;
        this.dragStart = { x: p1.x, y: p1.y, camX: cam.scrollX, camY: cam.scrollY };
      } else if (!ptr.isDown && !p1.isDown) {
        this.isDragging = false;
      }
    });

    // Колёсико мыши
    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, MIN_ZOOM, MAX_ZOOM);
    });
  }

  // ─── События ─────────────────────────────────────────────────────────────

  private subscribeToEvents(): void {
    const onItemsUpdated = (items: SceneItem[]) => this.renderSceneItems(items);
    const onProgress = (goal: CollectiveGoal) => this.updateCollectiveVisuals(goal);
    const onFinale = () => this.scene.launch(SCENE_KEYS.FINALE);
    const onStateSynced = (state: GameState) => {
      this.renderSceneItems(state.sceneItems);
      this.updateCollectiveVisuals(state.collectiveGoal);
    };

    EventBus.on(EVENTS.SCENE_ITEMS_UPDATED, onItemsUpdated);
    EventBus.on(EVENTS.COLLECTIVE_PROGRESS, onProgress);
    EventBus.on(EVENTS.FINALE_TRIGGERED, onFinale);
    EventBus.on(EVENTS.STATE_SYNCED, onStateSynced);

    this.events.once('shutdown', () => {
      EventBus.off(EVENTS.SCENE_ITEMS_UPDATED, onItemsUpdated);
      EventBus.off(EVENTS.COLLECTIVE_PROGRESS, onProgress);
      EventBus.off(EVENTS.FINALE_TRIGGERED, onFinale);
      EventBus.off(EVENTS.STATE_SYNCED, onStateSynced);
      syncSystem.stop();
    });
  }

  private getCatalog(catalogId: string) {
    return gameStore.getCatalogEntry(catalogId) ?? { imageKey: catalogId };
  }
}
