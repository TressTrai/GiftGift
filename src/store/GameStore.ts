import { CatalogEntry, GameState, InventoryItem, SceneItem, WrappedGift } from '../types';
import { EventBus } from '../utils/eventBus';
import { EVENTS } from '../utils/constants';

/**
 * Единое хранилище состояния игры.
 * Синхронизируется с сервером при каждом заходе.
 * Все сцены читают состояние отсюда.
 */
class GameStore {
  private state: GameState | null = null;
  private catalogMap: Map<string, CatalogEntry> = new Map();
  private _pendingHourlyItems: InventoryItem[] = [];

  /** Загружается один раз из catalog.json в BootScene */
  initCatalog(entries: CatalogEntry[]): void {
    this.catalogMap.clear();
    entries.forEach(e => this.catalogMap.set(e.id, e));
  }

  getCatalogEntry(catalogId: string): CatalogEntry | undefined {
    return this.catalogMap.get(catalogId);
  }

  /** Загружается один раз при старте сессии */
  init(state: GameState): void {
    this.state = state;
    EventBus.emit(EVENTS.STATE_SYNCED, state);

    if (state.newHourlyItems && state.newHourlyItems.length > 0) {
      this._pendingHourlyItems = state.newHourlyItems;
      EventBus.emit(EVENTS.HOURLY_ITEMS_RECEIVED, state.newHourlyItems);
    }
  }

  get pendingHourlyItems(): InventoryItem[] {
    return this._pendingHourlyItems;
  }

  clearPendingHourlyItems(): void {
    this._pendingHourlyItems = [];
  }

  get(): GameState {
    if (!this.state) throw new Error('GameStore not initialized');
    return this.state;
  }

  get user() {
    return this.get().user;
  }

  get inventory(): InventoryItem[] {
    return this.get().inventory;
  }

  get wrappedGifts(): WrappedGift[] {
    return this.get().wrappedGifts;
  }

  get sceneItems(): SceneItem[] {
    return this.get().sceneItems;
  }

  get personalGoal() {
    return this.get().personalGoal;
  }

  get collectiveGoal() {
    return this.get().collectiveGoal;
  }

  get allUsers() {
    return this.get().allUsers;
  }

  // ─── Мутации ────────────────────────────────────────────────────────────────

  applySceneItemsUpdate(items: SceneItem[]): void {
    this.get().sceneItems = items;
    EventBus.emit(EVENTS.SCENE_ITEMS_UPDATED, items);
  }

  applyItemCollected(instanceId: string, newItem: InventoryItem): void {
    const state = this.get();
    state.sceneItems = state.sceneItems.filter(i => i.instanceId !== instanceId);
    state.inventory.push(newItem);
    EventBus.emit(EVENTS.ITEM_COLLECTED, newItem);
  }

  applyGiftSent(instanceId: string): void {
    const state = this.get();
    state.inventory = state.inventory.filter(i => i.instanceId !== instanceId);
    state.collectiveGoal.current += 1;
    EventBus.emit(EVENTS.GIFT_SENT, instanceId);
    EventBus.emit(EVENTS.COLLECTIVE_PROGRESS, state.collectiveGoal);
  }

  applyGiftRevealed(instanceId: string, revealedItem: InventoryItem): void {
    const state = this.get();
    state.wrappedGifts = state.wrappedGifts.filter(g => g.instanceId !== instanceId);
    state.inventory.push(revealedItem);

    // Проверяем личную тройку целей
    const goal = state.personalGoal;
    const idx = goal.catalogIds.indexOf(revealedItem.catalogId);
    if (idx !== -1 && !goal.collected[idx]) {
      goal.collected[idx] = true;
      if (goal.collected.every(Boolean)) {
        goal.completedCount += 1;
        EventBus.emit(EVENTS.TRIO_COMPLETED);
        // Сервер пришлёт новую тройку при следующей синхронизации
      }
    }

    EventBus.emit(EVENTS.GIFT_REVEALED, revealedItem);
  }

  applyNewWrappedGifts(gifts: WrappedGift[]): void {
    this.get().wrappedGifts.push(...gifts);
    if (gifts.length > 0) {
      EventBus.emit(EVENTS.NEW_GIFTS_RECEIVED, gifts.length);
    }
  }
}

export const gameStore = new GameStore();
