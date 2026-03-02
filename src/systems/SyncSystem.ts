import { fetchState } from '../api/game';
import { gameStore } from '../store/GameStore';
import { EventBus } from '../utils/eventBus';
import { EVENTS, GAME_END_HOUR, COLLECTIVE_GOAL_MIN, COLLECTIVE_GOAL_MAX, COLLECTIVE_GOAL_COEFF } from '../utils/constants';

/**
 * SyncSystem — синхронизация с сервером.
 * - Polling при каждом заходе (fetchState)
 * - Проверка финала в 19:00
 * - Адаптивный пересчёт коллективной цели (12:00, 15:00, 17:00)
 */
export class SyncSystem {
  private pollTimer?: ReturnType<typeof setInterval>;

  /** Запускается один раз при старте сессии */
  start(): void {
    this.syncNow();
    // Лёгкий polling каждые 30 сек для обновления предметов на сцене
    this.pollTimer = setInterval(() => this.syncNow(), 30_000);
    this.scheduleFinaleCheck();
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async syncNow(): Promise<void> {
    try {
      const state = await fetchState();
      gameStore.init(state);
    } catch {
      // Тихая ошибка — игра продолжает работать с кэшированным состоянием
    }
  }

  private scheduleFinaleCheck(): void {
    const now = new Date();
    const finale = new Date(now);
    finale.setHours(GAME_END_HOUR, 0, 0, 0);

    if (now >= finale) {
      EventBus.emit(EVENTS.FINALE_TRIGGERED);
      return;
    }

    const msUntilFinale = finale.getTime() - now.getTime();
    setTimeout(() => {
      EventBus.emit(EVENTS.FINALE_TRIGGERED);
    }, msUntilFinale);
  }

  /**
   * Пересчёт адаптивной коллективной цели.
   * Вызывается сервером в 12:00, 15:00, 17:00.
   * Оставлен здесь для документации логики.
   */
  static calculateAdaptiveGoal(
    giftedSoFar: number,
    elapsedHours: number,
  ): number {
    if (elapsedHours <= 0) return COLLECTIVE_GOAL_MIN;

    const ratePerHour = giftedSoFar / elapsedHours;
    const totalGameHours = GAME_END_HOUR - 10; // 9 часов
    const projected = ratePerHour * totalGameHours;
    const goal = Math.round(projected * COLLECTIVE_GOAL_COEFF);

    return Math.max(COLLECTIVE_GOAL_MIN, Math.min(COLLECTIVE_GOAL_MAX, goal));
  }
}

export const syncSystem = new SyncSystem();
