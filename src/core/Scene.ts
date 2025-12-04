/**
 * 场景基类
 * 场景管理一组实体，处理场景生命周期
 */

import { World } from 'miniplex';
import type { Engine } from './Engine';
import type { GameEntity } from './Entity';

export abstract class Scene {
  /** 场景名称 */
  name = '';

  /** 引擎引用 */
  protected engine!: Engine;

  /** 实体世界 */
  protected world!: World<GameEntity>;

  /** 场景是否激活 */
  active = false;

  /**
   * 场景创建时调用
   */
  onCreate?(): void;

  /**
   * 场景进入时调用
   */
  onEnter?(): void;

  /**
   * 每帧更新
   */
  onUpdate?(dt: number): void;

  /**
   * 渲染
   */
  onRender?(ctx: CanvasRenderingContext2D): void;

  /**
   * 场景退出时调用
   */
  onExit?(): void;

  /**
   * 场景销毁时调用
   */
  onDestroy?(): void;

  /**
   * 创建实体
   */
  spawn<T extends Partial<GameEntity>>(components: T): GameEntity & T {
    return this.world.add(components as GameEntity & T);
  }

  /**
   * 销毁实体
   */
  despawn(entity: GameEntity): void {
    this.world.remove(entity);
  }

  /**
   * 查询实体
   */
  query<T extends keyof GameEntity>(...components: T[]) {
    return this.world.with(...components);
  }

  /**
   * 获取系统
   */
  protected getSystem<T>(SystemClass: new () => T): T {
    return this.engine.system(SystemClass as never) as T;
  }

  /**
   * 发送事件
   */
  protected emit<K extends string>(event: K, data?: unknown): void {
    this.engine.emit(event, data);
  }

  /**
   * 监听事件
   */
  protected on<K extends string>(
    event: K,
    callback: (data: unknown) => void
  ): { unsubscribe: () => void } {
    return this.engine.on(event, callback);
  }

  /**
   * 切换场景
   */
  protected goto(sceneName: string): void {
    this.engine.goto(sceneName);
  }
}

export type SceneClass = new () => Scene;
