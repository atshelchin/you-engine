/**
 * 游戏快速启动辅助函数
 * 自动注册常用系统，减少样板代码
 */

import { Engine, type EngineConfig } from '../core/Engine';
import { InputSystem } from '../systems/InputSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { TweenSystem } from '../systems/TweenSystem';
import { AnimationSystem } from '../systems/AnimationSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { MatterPhysicsSystem } from '../systems/MatterPhysicsSystem';
import { SpatialHashSystem } from '../systems/SpatialHashSystem';
import { RenderSystem } from '../systems/RenderSystem';

/** 可选系统类型 */
export type SystemType =
  | 'input'
  | 'camera'
  | 'tween'
  | 'animation'
  | 'audio'
  | 'particles'
  | 'physics'
  | 'spatial'
  | 'render';

/** 快速启动配置 */
export interface QuickStartConfig extends EngineConfig {
  /** 要启用的系统 (默认: ['input', 'camera', 'tween', 'animation', 'render']) */
  systems?: SystemType[];
  /** 是否启用调试模式 (默认: false) */
  debug?: boolean;
  /** 空间分区网格大小 (默认: 64) */
  spatialCellSize?: number;
}

/**
 * 快速创建游戏引擎
 * 自动注册常用系统，减少样板代码
 *
 * @example
 * ```typescript
 * import { createGame } from 'you-engine';
 *
 * const game = createGame({
 *   canvas: '#game',
 *   width: 800,
 *   height: 600,
 *   systems: ['input', 'camera', 'tween', 'animation', 'render']
 * });
 *
 * game.start();
 * ```
 */
export function createGame(config: QuickStartConfig): Engine {
  const {
    systems = ['input', 'camera', 'tween', 'animation', 'render'],
    debug = false,
    spatialCellSize = 64,
    ...engineConfig
  } = config;

  // 创建引擎
  const engine = new Engine(engineConfig);

  // 启用调试
  if (debug) {
    engine.debug = true;
  }

  // 注册系统 (按依赖顺序)
  if (systems.includes('input')) {
    engine.use(InputSystem);
  }

  if (systems.includes('camera')) {
    engine.use(CameraSystem);
  }

  if (systems.includes('tween')) {
    engine.use(TweenSystem);
  }

  if (systems.includes('animation')) {
    engine.use(AnimationSystem);
  }

  if (systems.includes('audio')) {
    engine.use(AudioSystem);
  }

  if (systems.includes('physics')) {
    engine.use(MatterPhysicsSystem);
  }

  if (systems.includes('spatial')) {
    const spatialSystem = new SpatialHashSystem();
    spatialSystem.cellSize = spatialCellSize;
    engine.use(SpatialHashSystem);
  }

  if (systems.includes('particles')) {
    engine.use(ParticleSystem);
  }

  if (systems.includes('render')) {
    engine.use(RenderSystem);
  }

  return engine;
}

/**
 * 创建完整游戏引擎（包含所有系统）
 *
 * @example
 * ```typescript
 * import { createFullGame } from 'you-engine';
 *
 * const game = createFullGame({
 *   canvas: '#game',
 *   width: 800,
 *   height: 600
 * });
 * ```
 */
export function createFullGame(config: Omit<QuickStartConfig, 'systems'>): Engine {
  return createGame({
    ...config,
    systems: [
      'input',
      'camera',
      'tween',
      'animation',
      'audio',
      'physics',
      'spatial',
      'particles',
      'render',
    ],
  });
}
