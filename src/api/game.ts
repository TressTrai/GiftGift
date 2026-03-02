import { api } from './client';
import { GameState, GiftPayload, InventoryItem, SceneItem } from '../types';

/** Полная синхронизация при заходе */
export function fetchState(): Promise<GameState> {
  return api.get<GameState>('/game/state');
}

/** Собрать предмет со сцены */
export function collectItem(instanceId: string): Promise<SceneItem[]> {
  return api.post<SceneItem[]>('/game/collect', { instanceId });
}

/** Подарить предмет или подарок */
export function sendGift(payload: GiftPayload): Promise<InventoryItem> {
  return api.post<InventoryItem>('/game/gift', payload);
}

/** Раскрыть нераскрытый подарок */
export function revealGift(instanceId: string): Promise<InventoryItem> {
  return api.post<InventoryItem>('/game/reveal', { instanceId });
}
