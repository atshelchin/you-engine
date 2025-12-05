/**
 * 系统基类
 * 系统负责处理特定领域的逻辑（输入、渲染、物理等）
 */

import type { Engine } from './Engine';
import { SystemPhase } from './SystemPhase';

export abstract class System {
  /** 系统执行阶段 (替代 priority) */
  static phase: SystemPhase = SystemPhase.Update;

  /** @deprecated 使用 phase 代替 */
  static priority = 0;

  /** 系统是否启用 */
  enabled = true;

  /** 引擎引用 */
  protected engine!: Engine;

  /**
   * 系统初始化时调用
   */
  onCreate?(): void;

  /**
   * 每帧更新前调用
   */
  onPreUpdate?(dt: number): void;

  /**
   * 每帧更新时调用
   */
  onUpdate?(dt: number): void;

  /**
   * 每帧更新后调用
   */
  onPostUpdate?(dt: number): void;

  /**
   * 渲染前调用
   */
  onPreRender?(ctx: CanvasRenderingContext2D): void;

  /**
   * 渲染时调用
   */
  onRender?(ctx: CanvasRenderingContext2D): void;

  /**
   * 渲染后调用
   */
  onPostRender?(ctx: CanvasRenderingContext2D): void;

  /**
   * 系统销毁时调用
   */
  onDestroy?(): void;

  /**
   * 获取其他系统
   */
  protected system<T extends System>(SystemClass: new () => T): T {
    return this.engine.system(SystemClass);
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
  protected on<K extends string>(event: K, callback: (data: unknown) => void): void {
    this.engine.on(event, callback);
  }
}

export type SystemClass = new () => System;
