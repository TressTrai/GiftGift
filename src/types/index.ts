// ─── Пользователь ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

// ─── Каталог ─────────────────────────────────────────────────────────────────

/** Запись в каталоге (статический контент, 50 штук) */
export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  imageKey: string;           // ключ в Phaser texture cache
}

// ─── Предметы и Подарки ───────────────────────────────────────────────────────

export type InventoryItemType = 'item' | 'gift';

/** Предмет в инвентаре (собран со сцены или получен как подарок) */
export interface InventoryItem {
  instanceId: string;
  catalogId: string;
  type: InventoryItemType;
  /** Заполнен для type='gift': от кого */
  fromUserId?: string;
  fromUserName?: string;      // кэшировано с момента дарения
  isAnonymous?: boolean;
  message?: string;
  receivedAt: string;
}

/** Нераскрытый подарок (wrap) */
export interface WrappedGift {
  instanceId: string;
  /** Содержимое скрыто до раскрытия */
  receivedAt: string;
  fromUserId?: string;        // null если анонимно
  fromUserName?: string;
  message?: string;
}

// ─── Сцена ───────────────────────────────────────────────────────────────────

/** Предмет расположенный на сцене (глобальный пул) */
export interface SceneItem {
  instanceId: string;
  catalogId: string;
  spawnPointIndex: number;    // 0-11, индекс из SPAWN_POINTS
  spawnedAt: string;
}

// ─── Личная коллекция ─────────────────────────────────────────────────────────

export interface PersonalGoal {
  catalogIds: [string, string, string];
  collected: [boolean, boolean, boolean];
  completedCount: number;     // сколько всего троек закрыто за день
}

// ─── Коллективная цель ────────────────────────────────────────────────────────

export interface CollectiveGoal {
  current: number;            // сколько подарков подарено всего
  target: number;             // адаптивная цель
  lastRecalcAt: string;
}

// ─── Состояние игры ───────────────────────────────────────────────────────────

/** Полное состояние, синхронизируемое с сервером при заходе */
export interface GameState {
  user: User;
  inventory: InventoryItem[];
  wrappedGifts: WrappedGift[];
  sceneItems: SceneItem[];
  personalGoal: PersonalGoal;
  collectiveGoal: CollectiveGoal;
  allUsers: User[];           // список всех зарегистрировавшихся (для дарения)
  isFinale: boolean;          // true после 19:00
  /** Предметы из часовой выдачи, ещё не показанные игроку */
  newHourlyItems: InventoryItem[];
}

// ─── API типы ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface GiftPayload {
  instanceId: string;
  toUserId: string;
  isAnonymous: boolean;
  message?: string;
  /** catalogId который получит получатель:
   *  item → gift: тот же catalogId (вид не меняется)
   *  gift → gift: CatalogEntry.transformsTo (трансформация) */
  resultCatalogId: string;
}
