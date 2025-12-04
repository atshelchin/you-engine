/**
 * Animation Component - 动画组件
 *
 * 支持补间动画、关键帧动画、序列动画等
 */

import { Component } from '../core/Component';
import { Signal } from '../core/Signal';
import type { Node } from '../core/Node';

// 用于动画的节点类型，支持动态属性
type AnimatableNode = Node & Record<string, unknown>;

// ==================== 缓动函数 ====================

export type EasingFunction = (t: number) => number;

export const Easing = {
  // 线性
  linear: (t: number) => t,

  // 二次方
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => t * (2 - t),
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // 三次方
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => --t * t * t + 1,
  cubicInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // 弹性
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },

  // 回弹
  backIn: (t: number) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  backOut: (t: number) => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  },

  // 弹簧
  elastic: (t: number) => {
    return t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
};

// ==================== 补间动画 ====================

export interface TweenConfig {
  // 目标属性
  to: Record<string, number>;

  // 持续时间(秒)
  duration: number;

  // 缓动函数
  easing?: EasingFunction;

  // 延迟(秒)
  delay?: number;

  // 循环
  loop?: boolean;
  yoyo?: boolean; // 来回播放

  // 回调
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export class Tween extends Component {
  private from: Record<string, number> = {};
  private to: Record<string, number>;
  private duration: number;
  private easing: EasingFunction;
  private delay: number;
  private loop: boolean;
  private yoyo: boolean;

  private time = 0;
  private delayTimer = 0;
  private isStarted = false;
  private isReversed = false;

  // 信号
  signals = {
    started: new Signal<void>(),
    updated: new Signal<number>(),
    completed: new Signal<void>(),
  };

  constructor(config: TweenConfig) {
    super();

    this.to = config.to;
    this.duration = config.duration;
    this.easing = config.easing || Easing.linear;
    this.delay = config.delay || 0;
    this.loop = config.loop || false;
    this.yoyo = config.yoyo || false;

    // 连接回调
    if (config.onStart) this.signals.started.on(config.onStart);
    if (config.onUpdate) this.signals.updated.on(config.onUpdate);
    if (config.onComplete) this.signals.completed.on(config.onComplete);
  }

  onInit(): void {
    // 记录初始值
    const animNode = this.node as AnimatableNode;
    for (const key in this.to) {
      this.from[key] = animNode[key] as number;
    }
  }

  onUpdate(dt: number): void {
    // 延迟
    if (this.delayTimer < this.delay) {
      this.delayTimer += dt;
      return;
    }

    // 开始
    if (!this.isStarted) {
      this.isStarted = true;
      this.signals.started.emit();
    }

    // 更新时间
    this.time += dt;

    if (this.time >= this.duration) {
      // 完成
      this.time = this.duration;
      this.updateProperties(1);
      this.signals.updated.emit(1);
      this.signals.completed.emit();

      if (this.loop) {
        if (this.yoyo) {
          // 交换起始和目标
          this.isReversed = !this.isReversed;
          [this.from, this.to] = [this.to, this.from];
        }
        this.time = 0;
        this.isStarted = false;
      } else {
        this.enabled = false;
      }
    } else {
      // 更新
      const t = this.time / this.duration;
      const easedT = this.easing(t);
      this.updateProperties(easedT);
      this.signals.updated.emit(easedT);
    }
  }

  private updateProperties(t: number): void {
    const animNode = this.node as AnimatableNode;
    for (const key in this.to) {
      const from = this.from[key];
      const to = this.to[key];
      animNode[key] = from + (to - from) * t;
    }
  }

  /**
   * 重新播放
   */
  restart(): void {
    this.time = 0;
    this.delayTimer = 0;
    this.isStarted = false;
    this.enabled = true;
  }

  /**
   * 暂停
   */
  pause(): void {
    this.enabled = false;
  }

  /**
   * 继续
   */
  resume(): void {
    this.enabled = true;
  }
}

// ==================== 关键帧动画 ====================

export interface Keyframe {
  time: number; // 时间点(0-1)
  values: Record<string, number>;
  easing?: EasingFunction;
}

export interface KeyframeAnimationConfig {
  keyframes: Keyframe[];
  duration: number;
  loop?: boolean;
  onComplete?: () => void;
}

export class KeyframeAnimation extends Component {
  private keyframes: Keyframe[];
  private duration: number;
  private loop: boolean;
  private time = 0;
  private currentKeyframe = 0;

  signals = {
    completed: new Signal<void>(),
  };

  constructor(config: KeyframeAnimationConfig) {
    super();

    this.keyframes = config.keyframes.sort((a, b) => a.time - b.time);
    this.duration = config.duration;
    this.loop = config.loop || false;

    if (config.onComplete) {
      this.signals.completed.on(config.onComplete);
    }
  }

  onUpdate(dt: number): void {
    this.time += dt;

    if (this.time >= this.duration) {
      if (this.loop) {
        this.time = 0;
        this.currentKeyframe = 0;
      } else {
        this.enabled = false;
        this.signals.completed.emit();
        return;
      }
    }

    // 归一化时间 (0-1)
    const t = this.time / this.duration;

    // 找到当前关键帧段
    while (
      this.currentKeyframe < this.keyframes.length - 1 &&
      t > this.keyframes[this.currentKeyframe + 1].time
    ) {
      this.currentKeyframe++;
    }

    // 插值
    if (this.currentKeyframe < this.keyframes.length - 1) {
      const current = this.keyframes[this.currentKeyframe];
      const next = this.keyframes[this.currentKeyframe + 1];

      const segmentT = (t - current.time) / (next.time - current.time);

      const easing = current.easing || Easing.linear;
      const easedT = easing(segmentT);

      // 更新属性
      const animNode = this.node as AnimatableNode;
      for (const key in next.values) {
        const from = current.values[key] ?? (animNode[key] as number);
        const to = next.values[key];
        animNode[key] = from + (to - from) * easedT;
      }
    }
  }
}

// ==================== 序列动画 ====================

export interface SequenceStep {
  type: 'tween' | 'wait' | 'call';
  config?: TweenConfig | number | (() => void);
}

export class SequenceAnimation extends Component {
  private steps: SequenceStep[];
  private currentStep = 0;
  private currentTween: Tween | null = null;
  private waitTimer = 0;

  signals = {
    completed: new Signal<void>(),
  };

  constructor(steps: SequenceStep[]) {
    super();
    this.steps = steps;
  }

  onInit(): void {
    this.startNextStep();
  }

  onUpdate(dt: number): void {
    const step = this.steps[this.currentStep];

    if (step.type === 'tween' && this.currentTween) {
      this.currentTween.onUpdate(dt);

      if (!this.currentTween.enabled) {
        this.node.removeComponent(this.currentTween);
        this.currentTween = null;
        this.nextStep();
      }
    } else if (step.type === 'wait') {
      this.waitTimer += dt;

      if (this.waitTimer >= (step.config as number)) {
        this.waitTimer = 0;
        this.nextStep();
      }
    }
  }

  private startNextStep(): void {
    if (this.currentStep >= this.steps.length) {
      this.signals.completed.emit();
      this.enabled = false;
      return;
    }

    const step = this.steps[this.currentStep];

    if (step.type === 'tween') {
      this.currentTween = this.node.addComponent(Tween, step.config as TweenConfig);
    } else if (step.type === 'call') {
      (step.config as () => void)();
      this.nextStep();
    }
  }

  private nextStep(): void {
    this.currentStep++;
    this.startNextStep();
  }
}

// ==================== 动画工厂 ====================

/**
 * 便捷的动画创建函数
 */
export const Animate = {
  /**
   * 移动到指定位置
   */
  moveTo(node: Node, x: number, y: number, duration: number, easing?: EasingFunction): Tween {
    return node.addComponent(Tween, {
      to: { x, y },
      duration,
      easing,
    });
  },

  /**
   * 淡入
   */
  fadeIn(node: Node, duration: number): Tween {
    (node as AnimatableNode).alpha = 0;
    return node.addComponent(Tween, {
      to: { alpha: 1 },
      duration,
      easing: Easing.linear,
    });
  },

  /**
   * 淡出
   */
  fadeOut(node: Node, duration: number): Tween {
    return node.addComponent(Tween, {
      to: { alpha: 0 },
      duration,
      easing: Easing.linear,
    });
  },

  /**
   * 缩放
   */
  scaleTo(node: Node, scale: number, duration: number): Tween {
    return node.addComponent(Tween, {
      to: { scale },
      duration,
      easing: Easing.quadOut,
    });
  },

  /**
   * 旋转
   */
  rotateTo(node: Node, rotation: number, duration: number): Tween {
    return node.addComponent(Tween, {
      to: { rotation },
      duration,
      easing: Easing.linear,
    });
  },

  /**
   * 弹跳
   */
  bounce(node: Node, height: number, duration: number): Tween {
    const startY = node.y;
    return node.addComponent(Tween, {
      to: { y: startY - height },
      duration: duration / 2,
      easing: Easing.quadOut,
      yoyo: true,
      onComplete: () => {
        node.y = startY;
      },
    });
  },

  /**
   * 晃动
   */
  shake(node: Node, intensity: number, duration: number): void {
    const startX = node.x;
    const startY = node.y;
    const steps = Math.floor(duration / 0.05);

    const sequence: SequenceStep[] = [];

    for (let i = 0; i < steps; i++) {
      sequence.push({
        type: 'tween',
        config: {
          to: {
            x: startX + (Math.random() - 0.5) * intensity,
            y: startY + (Math.random() - 0.5) * intensity,
          },
          duration: 0.05,
        },
      });
    }

    sequence.push({
      type: 'tween',
      config: {
        to: { x: startX, y: startY },
        duration: 0.1,
      },
    });

    node.addComponent(SequenceAnimation, sequence);
  },
};

// ==================== 使用示例 ====================

/*
// 1. 简单补间
node.addComponent(Tween, {
  to: { x: 200, y: 100, rotation: Math.PI },
  duration: 2.0,
  easing: Easing.cubicOut,
  onComplete: () => console.log('Done!')
});

// 2. 便捷函数
Animate.moveTo(player, 300, 200, 1.5, Easing.quadInOut);
Animate.fadeIn(menu, 0.5);
Animate.bounce(coin, 50, 1.0);

// 3. 关键帧动画
node.addComponent(KeyframeAnimation, {
  keyframes: [
    { time: 0, values: { x: 0, y: 0, scale: 1 } },
    { time: 0.3, values: { x: 100, y: 50, scale: 1.5 }, easing: Easing.quadOut },
    { time: 0.7, values: { x: 200, y: 0, scale: 1.2 }, easing: Easing.quadIn },
    { time: 1.0, values: { x: 300, y: 0, scale: 1 }, easing: Easing.linear }
  ],
  duration: 3.0,
  loop: true
});

// 4. 序列动画
node.addComponent(SequenceAnimation, [
  { type: 'tween', config: { to: { x: 100 }, duration: 1.0 } },
  { type: 'wait', config: 0.5 },
  { type: 'tween', config: { to: { y: 100 }, duration: 1.0 } },
  { type: 'call', config: () => console.log('Halfway!') },
  { type: 'tween', config: { to: { x: 0, y: 0 }, duration: 2.0 } }
]);
*/
