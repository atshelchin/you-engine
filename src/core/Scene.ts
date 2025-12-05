/**
 * 场景基类
 * 场景管理一组实体，处理场景生命周期
 */

import type { World } from 'miniplex';
import type { Engine } from './Engine';
import type { GameEntity } from './Entity';

export abstract class Scene {
  /** 场景名称 */
  name = '';

  /** 引擎引用 - 直接暴露 */
  engine!: Engine;

  /** 实体世界 - 直接暴露 */
  world!: World<GameEntity>;

  /** 场景是否激活 */
  active = false;

  /** 场景创建时调用 */
  onCreate?(): void;

  /** 场景进入时调用 */
  onEnter?(): void;

  /** 每帧更新 */
  onUpdate?(dt: number): void;

  /** 渲染 */
  onRender?(ctx: CanvasRenderingContext2D): void;

  /** 场景退出时调用 */
  onExit?(): void;

  /** 场景销毁时调用 */
  onDestroy?(): void;
}

export type SceneClass = new () => Scene;
