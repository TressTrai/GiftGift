import Phaser from 'phaser';

/**
 * Глобальная шина событий для связи между сценами Phaser.
 * Используется вместо прямых ссылок между сценами.
 */
export const EventBus = new Phaser.Events.EventEmitter();
