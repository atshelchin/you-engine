/**
 * 缓动动画系统
 * 基于 @tweenjs/tween.js 封装
 */

import * as TWEEN from '@tweenjs/tween.js';
import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';

export type EasingFunction = (amount: number) => number;

/** 常用缓动函数 */
export const Easing = {
  Linear: TWEEN.Easing.Linear.None,
  QuadIn: TWEEN.Easing.Quadratic.In,
  QuadOut: TWEEN.Easing.Quadratic.Out,
  QuadInOut: TWEEN.Easing.Quadratic.InOut,
  CubicIn: TWEEN.Easing.Cubic.In,
  CubicOut: TWEEN.Easing.Cubic.Out,
  CubicInOut: TWEEN.Easing.Cubic.InOut,
  SineIn: TWEEN.Easing.Sinusoidal.In,
  SineOut: TWEEN.Easing.Sinusoidal.Out,
  SineInOut: TWEEN.Easing.Sinusoidal.InOut,
  ExpoIn: TWEEN.Easing.Exponential.In,
  ExpoOut: TWEEN.Easing.Exponential.Out,
  ExpoInOut: TWEEN.Easing.Exponential.InOut,
  ElasticIn: TWEEN.Easing.Elastic.In,
  ElasticOut: TWEEN.Easing.Elastic.Out,
  ElasticInOut: TWEEN.Easing.Elastic.InOut,
  BackIn: TWEEN.Easing.Back.In,
  BackOut: TWEEN.Easing.Back.Out,
  BackInOut: TWEEN.Easing.Back.InOut,
  BounceIn: TWEEN.Easing.Bounce.In,
  BounceOut: TWEEN.Easing.Bounce.Out,
  BounceInOut: TWEEN.Easing.Bounce.InOut,
};

export interface TweenOptions<T> {
  duration: number;
  easing?: EasingFunction;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  onUpdate?: (object: T) => void;
  onComplete?: (object: T) => void;
  onStart?: (object: T) => void;
  onStop?: (object: T) => void;
}

export class TweenSystem extends System {
  static phase = SystemPhase.Update; // 常规执行：更新补间动画

  private group = new TWEEN.Group();

  onUpdate(): void {
    this.group.update(this.engine.time);
  }

  onDestroy(): void {
    this.group.removeAll();
  }

  /** 配置 tween（内部方法） */
  private configure<T extends object>(
    tween: TWEEN.Tween<T>,
    options: TweenOptions<T>
  ): TWEEN.Tween<T> {
    tween.easing(options.easing ?? Easing.Linear);
    if (options.delay !== undefined) tween.delay(options.delay);
    if (options.repeat !== undefined) tween.repeat(options.repeat);
    if (options.yoyo) tween.yoyo(true);
    if (options.onUpdate) tween.onUpdate(options.onUpdate);
    if (options.onComplete) tween.onComplete(options.onComplete);
    if (options.onStart) tween.onStart(options.onStart);
    if (options.onStop) tween.onStop(options.onStop);
    return tween;
  }

  /** 创建并启动一个 tween */
  to<T extends object>(object: T, target: Partial<T>, options: TweenOptions<T>): TWEEN.Tween<T> {
    const tween = new TWEEN.Tween(object, this.group).to(target, options.duration);
    this.configure(tween, options);
    tween.start(this.engine.time);
    return tween;
  }

  /** 创建一个 tween 但不立即启动 */
  create<T extends object>(
    object: T,
    target: Partial<T>,
    options: TweenOptions<T>
  ): TWEEN.Tween<T> {
    const tween = new TWEEN.Tween(object, this.group).to(target, options.duration);
    return this.configure(tween, options);
  }

  /** 链式 tween（按顺序执行） */
  chain<T extends object>(
    object: T,
    steps: { target: Partial<T>; options: TweenOptions<T> }[]
  ): TWEEN.Tween<T> | null {
    if (steps.length === 0) return null;

    const tweens = steps.map((step) => this.create(object, step.target, step.options));

    for (let i = 0; i < tweens.length - 1; i++) {
      tweens[i].chain(tweens[i + 1]);
    }

    tweens[0].start(this.engine.time);
    return tweens[0];
  }

  /** 停止所有 tween */
  stopAll(): void {
    this.group.removeAll();
  }

  /** 停止对象相关的所有 tween */
  stopTweensOf<T extends object>(object: T): void {
    for (const tween of this.group.getAll()) {
      // @ts-expect-error 访问内部对象
      if (tween._object === object) tween.stop();
    }
  }

  /** 获取活跃的 tween 数量 */
  get activeTweenCount(): number {
    return this.group.getAll().length;
  }
}
