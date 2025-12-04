/**
 * Game DSL - 游戏定义（策划文档即代码）
 *
 * 让策划师用自然语言般的代码定义游戏
 */

import { Engine } from '../core/Engine';
import type { Node } from '../core/Node';

export interface GameConfig {
  name?: string;
  canvas: string | HTMLCanvasElement;
  width?: number;
  height?: number;
  backgroundColor?: string;
  map?: MapConfig;
  characters?: CharacterConfig[];
  items?: ItemConfig[];
  audio?: AudioConfig;
  ui?: UIConfig;
}

export interface MapConfig {
  size: { width: number; height: number } | [number, number];
  view?: 'isometric' | 'topdown' | 'sideview';
  terrain?: Record<string, unknown>;
}

export interface CharacterConfig {
  id?: string;
  name: string;
  health?: number;
  speed?: number;
  position?: [number, number, number] | (() => [number, number, number]);
  appearance?: AppearanceConfig;
  abilities?: AbilityConfig[];
  behaviors?: BehaviorConfig[];
  onHealthBelow?: (threshold: number, callback: () => void) => void;
  onDeath?: () => void;
}

export interface AppearanceConfig {
  type: 'circle' | 'rect' | 'sprite' | 'composite';
  [key: string]: unknown;
}

export interface AbilityConfig {
  type: string;
  [key: string]: unknown;
}

export interface BehaviorConfig {
  type: string;
  [key: string]: unknown;
}

export interface ItemConfig {
  name: string;
  appearance?: AppearanceConfig;
  spawn?: SpawnConfig;
  onPickup?: (picker: Node) => void;
}

export interface SpawnConfig {
  type: 'interval' | 'fixed' | 'random';
  [key: string]: unknown;
}

export interface AudioConfig {
  sounds?: Record<string, string>;
  music?: string | string[];
}

export interface UIConfig {
  [key: string]: unknown;
}

/**
 * Game - 游戏实例
 */
export class Game {
  private engine: Engine;

  constructor(config: GameConfig) {
    // 创建引擎
    this.engine = new Engine({
      canvas: config.canvas,
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor,
    });

    // 初始化游戏
    this.init();
  }

  private init(): void {
    // TODO: 根据配置创建游戏对象
    // 这里会在后续步骤实现
  }

  start(): void {
    this.engine.start();
  }

  stop(): void {
    this.engine.stop();
  }

  getEngine(): Engine {
    return this.engine;
  }
}

/**
 * 创建游戏（策划师 API）
 */
export function createGame(config: GameConfig): Game {
  return new Game(config);
}

// ==================== 便捷函数 ====================

/**
 * 地图中心
 */
export function MapCenter(): [number, number, number] {
  // TODO: 从当前游戏配置获取
  return [0, 0, 0];
}

/**
 * 随机位置
 */
export function RandomPosition(): [number, number, number] {
  // TODO: 基于地图大小生成随机位置
  return [Math.random() * 10, Math.random() * 10, 0];
}

/**
 * 生成多个（用于批量创建敌人等）
 */
export function Spawn(count: number, factory: () => CharacterConfig): CharacterConfig[] {
  return Array.from({ length: count }, factory);
}
