/**
 * 缓动动画系统
 * 基于 @tweenjs/tween.js 封装
 */

import { System } from '../core/System';
import * as TWEEN from '@tweenjs/tween.js';

export type EasingFunction = (amount: number) => number;

/** 常用缓动函数 */
export const Easing = {
  Linear: TWEEN.Easing.Linear.None,

  // Quad
  QuadIn: TWEEN.Easing.Quadratic.In,
  QuadOut: TWEEN.Easing.Quadratic.Out,
  QuadInOut: TWEEN.Easing.Quadratic.InOut,

  // Cubic
  CubicIn: TWEEN.Easing.Cubic.In,
  CubicOut: TWEEN.Easing.Cubic.Out,
  CubicInOut: TWEEN.Easing.Cubic.InOut,

  // Quart
  QuartIn: TWEEN.Easing.Quartic.In,
  QuartOut: TWEEN.Easing.Quartic.Out,
  QuartInOut: TWEEN.Easing.Quartic.InOut,

  // Quint
  QuintIn: TWEEN.Easing.Quintic.In,
  QuintOut: TWEEN.Easing.Quintic.Out,
  QuintInOut: TWEEN.Easing.Quintic.InOut,

  // Sine
  SineIn: TWEEN.Easing.Sinusoidal.In,
  SineOut: TWEEN.Easing.Sinusoidal.Out,
  SineInOut: TWEEN.Easing.Sinusoidal.InOut,

  // Expo
  ExpoIn: TWEEN.Easing.Exponential.In,
  ExpoOut: TWEEN.Easing.Exponential.Out,
  ExpoInOut: TWEEN.Easing.Exponential.InOut,

  // Circ
  CircIn: TWEEN.Easing.Circular.In,
  CircOut: TWEEN.Easing.Circular.Out,
  CircInOut: TWEEN.Easing.Circular.InOut,

  // Elastic
  ElasticIn: TWEEN.Easing.Elastic.In,
  ElasticOut: TWEEN.Easing.Elastic.Out,
  ElasticInOut: TWEEN.Easing.Elastic.InOut,

  // Back
  BackIn: TWEEN.Easing.Back.In,
  BackOut: TWEEN.Easing.Back.Out,
  BackInOut: TWEEN.Easing.Back.InOut,

  // Bounce
  BounceIn: TWEEN.Easing.Bounce.In,
  BounceOut: TWEEN.Easing.Bounce.Out,
  BounceInOut: TWEEN.Easing.Bounce.InOut,
};

export interface TweenOptions<T> {
  /** 持续时间（毫秒） */
  duration: number;
  /** 缓动函数 */
  easing?: EasingFunction;
  /** 延迟开始（毫秒） */
  delay?: number;
  /** 重复次数（Infinity 为无限） */
  repeat?: number;
  /** 是否往返（yoyo） */
  yoyo?: boolean;
  /** 更新回调 */
  onUpdate?: (object: T) => void;
  /** 完成回调 */
  onComplete?: (object: T) => void;
  /** 开始回调 */
  onStart?: (object: T) => void;
  /** 停止回调 */
  onStop?: (object: T) => void;
}

export class TweenSystem extends System {
  static priority = -10; // 在其他系统之前

  /** Tween 组 */
  private group = new TWEEN.Group();

  onUpdate(_dt: number): void {
    // 使用引擎时间更新
    this.group.update(this.engine.time);
  }

  onDestroy(): void {
    this.stopAll();
  }

  /**
   * 创建并启动一个 tween
   */
  to<T extends object>(
    object: T,
    target: Partial<T>,
    options: TweenOptions<T>
  ): TWEEN.Tween<T> {
    const tween = new TWEEN.Tween(object, this.group)
      .to(target, options.duration)
      .easing(options.easing ?? Easing.Linear);

    if (options.delay !== undefined) {
      tween.delay(options.delay);
    }

    if (options.repeat !== undefined) {
      tween.repeat(options.repeat);
    }

    if (options.yoyo) {
      tween.yoyo(true);
    }

    if (options.onUpdate) {
      tween.onUpdate(options.onUpdate);
    }

    if (options.onComplete) {
      tween.onComplete(options.onComplete);
    }

    if (options.onStart) {
      tween.onStart(options.onStart);
    }

    if (options.onStop) {
      tween.onStop(options.onStop);
    }

    tween.start(this.engine.time);
    return tween;
  }

  /**
   * 创建一个 tween 但不立即启动
   */
  create<T extends object>(
    object: T,
    target: Partial<T>,
    options: TweenOptions<T>
  ): TWEEN.Tween<T> {
    const tween = new TWEEN.Tween(object, this.group)
      .to(target, options.duration)
      .easing(options.easing ?? Easing.Linear);

    if (options.delay !== undefined) {
      tween.delay(options.delay);
    }

    if (options.repeat !== undefined) {
      tween.repeat(options.repeat);
    }

    if (options.yoyo) {
      tween.yoyo(true);
    }

    if (options.onUpdate) {
      tween.onUpdate(options.onUpdate);
    }

    if (options.onComplete) {
      tween.onComplete(options.onComplete);
    }

    if (options.onStart) {
      tween.onStart(options.onStart);
    }

    if (options.onStop) {
      tween.onStop(options.onStop);
    }

    return tween;
  }

  /**
   * 链式 tween（按顺序执行）
   */
  chain<T extends object>(
    object: T,
    steps: { target: Partial<T>; options: TweenOptions<T> }[]
  ): TWEEN.Tween<T> | null {
    if (steps.length === 0) return null;

    const tweens = steps.map((step) => this.create(object, step.target, step.options));

    // 链接所有 tween
    for (let i = 0; i < tweens.length - 1; i++) {
      tweens[i].chain(tweens[i + 1]);
    }

    // 启动第一个
    tweens[0].start(this.engine.time);

    return tweens[0];
  }

  /**
   * 简单的延迟执行
   */
  delay(duration: number): Promise<void> {
    return new Promise((resolve) => {
      const obj = { value: 0 };
      this.to(obj, { value: 1 }, {
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * 简单的数值动画
   */
  animate(
    from: number,
    to: number,
    duration: number,
    onUpdate: (value: number) => void,
    options: Partial<TweenOptions<{ value: number }>> = {}
  ): TWEEN.Tween<{ value: number }> {
    const obj = { value: from };
    return this.to(obj, { value: to }, {
      duration,
      ...options,
      onUpdate: () => onUpdate(obj.value),
    });
  }

  /**
   * 停止所有 tween
   */
  stopAll(): void {
    this.group.removeAll();
  }

  /**
   * 停止对象相关的所有 tween
   */
  stopTweensOf<T extends object>(object: T): void {
    const tweens = this.group.getAll();
    for (const tween of tweens) {
      // @ts-expect-error 访问内部对象
      if (tween._object === object) {
        tween.stop();
      }
    }
  }

  /**
   * 获取活跃的 tween 数量
   */
  getActiveTweenCount(): number {
    return this.group.getAll().length;
  }

  /**
   * 移动到位置
   */
  moveTo(
    object: { x: number; y: number },
    x: number,
    y: number,
    duration: number,
    easing: EasingFunction = Easing.QuadOut
  ): TWEEN.Tween<{ x: number; y: number }> {
    return this.to(object, { x, y }, { duration, easing });
  }

  /**
   * 缩放到值
   */
  scaleTo(
    object: { scaleX: number; scaleY: number },
    scaleX: number,
    scaleY: number,
    duration: number,
    easing: EasingFunction = Easing.QuadOut
  ): TWEEN.Tween<{ scaleX: number; scaleY: number }> {
    return this.to(object, { scaleX, scaleY }, { duration, easing });
  }

  /**
   * 旋转到角度
   */
  rotateTo(
    object: { rotation: number },
    rotation: number,
    duration: number,
    easing: EasingFunction = Easing.QuadOut
  ): TWEEN.Tween<{ rotation: number }> {
    return this.to(object, { rotation }, { duration, easing });
  }

  /**
   * 淡入
   */
  fadeIn(
    object: { alpha: number },
    duration: number,
    easing: EasingFunction = Easing.Linear
  ): TWEEN.Tween<{ alpha: number }> {
    return this.to(object, { alpha: 1 }, { duration, easing });
  }

  /**
   * 淡出
   */
  fadeOut(
    object: { alpha: number },
    duration: number,
    easing: EasingFunction = Easing.Linear
  ): TWEEN.Tween<{ alpha: number }> {
    return this.to(object, { alpha: 0 }, { duration, easing });
  }

  /**
   * 弹跳效果
   */
  bounce(
    object: { scaleX: number; scaleY: number },
    intensity = 0.2,
    duration = 300
  ): TWEEN.Tween<{ scaleX: number; scaleY: number }> {
    const originalScaleX = object.scaleX;
    const originalScaleY = object.scaleY;

    return this.chain(object, [
      {
        target: {
          scaleX: originalScaleX * (1 + intensity),
          scaleY: originalScaleY * (1 - intensity * 0.5),
        },
        options: { duration: duration * 0.3, easing: Easing.QuadOut },
      },
      {
        target: {
          scaleX: originalScaleX * (1 - intensity * 0.5),
          scaleY: originalScaleY * (1 + intensity * 0.5),
        },
        options: { duration: duration * 0.3, easing: Easing.QuadInOut },
      },
      {
        target: { scaleX: originalScaleX, scaleY: originalScaleY },
        options: { duration: duration * 0.4, easing: Easing.ElasticOut },
      },
    ])!;
  }

  /**
   * 抖动效果
   */
  shake(
    object: { x: number; y: number },
    intensity = 10,
    duration = 500
  ): Promise<void> {
    return new Promise((resolve) => {
      const originalX = object.x;
      const originalY = object.y;
      const startTime = this.engine.time;

      const shakeObj = { progress: 0 };
      this.to(shakeObj, { progress: 1 }, {
        duration,
        onUpdate: () => {
          const elapsed = this.engine.time - startTime;
          const decay = 1 - elapsed / duration;
          object.x = originalX + (Math.random() - 0.5) * intensity * decay;
          object.y = originalY + (Math.random() - 0.5) * intensity * decay;
        },
        onComplete: () => {
          object.x = originalX;
          object.y = originalY;
          resolve();
        },
      });
    });
  }

  /**
   * 脉冲效果
   */
  pulse(
    object: { scaleX: number; scaleY: number },
    scale = 1.2,
    duration = 300
  ): TWEEN.Tween<{ scaleX: number; scaleY: number }> {
    const originalScaleX = object.scaleX;
    const originalScaleY = object.scaleY;

    return this.to(object, {
      scaleX: originalScaleX * scale,
      scaleY: originalScaleY * scale,
    }, {
      duration: duration / 2,
      easing: Easing.QuadOut,
      yoyo: true,
      repeat: 1,
    });
  }
}
