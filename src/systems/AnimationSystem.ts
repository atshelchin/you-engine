/**
 * 精灵帧动画系统
 * 自动管理精灵帧切换，支持多个动画状态
 */

import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';
import type { GameEntity } from '../core/Entity';
import { assets } from './AssetLoader';

/** 单个动画配置 */
export interface AnimationClip {
  /** 帧索引数组 (例如 [0, 1, 2, 3]) */
  frames: number[] | string[];
  /** 帧持续时间 (毫秒) */
  speed: number;
  /** 是否循环 */
  loop?: boolean;
  /** 播放完成回调 */
  onComplete?: () => void;
}

/** 动画组件 */
export interface Animation {
  /** 精灵图集 key */
  spriteSheet: string;
  /** 动画片段字典 */
  animations: Record<string, AnimationClip>;
  /** 当前播放的动画名称 */
  current: string;
  /** 当前帧索引 */
  frameIndex: number;
  /** 累积时间 */
  time: number;
  /** 是否正在播放 */
  playing: boolean;
  /** 播放速度倍率 (1 = 正常速度, 0.5 = 半速, 2 = 双速) */
  speed: number;
}

/**
 * 精灵帧动画系统
 * 自动更新和渲染精灵动画
 */
export class AnimationSystem extends System {
  static phase = SystemPhase.Update; // 常规执行：更新动画

  onUpdate(dt: number): void {
    for (const entity of this.engine.world.entities) {
      const anim = (entity as GameEntity & { animation?: Animation }).animation;
      if (!anim || !anim.playing) continue;

      const clip = anim.animations[anim.current];
      if (!clip) {
        console.warn(`Animation "${anim.current}" not found in sprite sheet "${anim.spriteSheet}"`);
        continue;
      }

      // 累积时间
      anim.time += dt * anim.speed;

      // 检查是否需要切换帧
      if (anim.time >= clip.speed) {
        anim.time -= clip.speed;
        anim.frameIndex++;

        // 循环或停止
        if (anim.frameIndex >= clip.frames.length) {
          if (clip.loop !== false) {
            anim.frameIndex = 0;
          } else {
            anim.frameIndex = clip.frames.length - 1;
            anim.playing = false;
            clip.onComplete?.();
          }
        }
      }
    }
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    for (const entity of this.engine.world.entities) {
      const anim = (entity as GameEntity & { animation?: Animation }).animation;
      if (!anim) continue;

      const { transform, sprite } = entity as GameEntity;
      if (!transform || !sprite || !sprite.visible) continue;

      const clip = anim.animations[anim.current];
      if (!clip) continue;

      // 获取当前帧
      const currentFrame = clip.frames[anim.frameIndex];
      if (currentFrame === undefined) continue;

      // 保存状态
      ctx.save();

      // 应用变换
      ctx.translate(transform.x, transform.y);
      if (transform.rotation) {
        ctx.rotate(transform.rotation);
      }
      if (transform.scaleX !== 1 || transform.scaleY !== 1) {
        ctx.scale(transform.scaleX, transform.scaleY);
      }

      // 应用透明度
      if (sprite.alpha !== undefined && sprite.alpha < 1) {
        ctx.globalAlpha = sprite.alpha;
      }

      // 自定义渲染优先
      if (sprite.render) {
        sprite.render(ctx, entity as GameEntity);
      } else {
        // 绘制精灵帧
        const frameKey = typeof currentFrame === 'number' ? currentFrame.toString() : currentFrame;
        const width = sprite.width || 32;
        const height = sprite.height || 32;

        try {
          assets.drawFrame(ctx, anim.spriteSheet, frameKey, -width / 2, -height / 2, width, height);
        } catch (error) {
          // 降级：绘制占位矩形
          ctx.fillStyle = sprite.color || '#ff00ff';
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }
      }

      // 恢复状态
      ctx.restore();
    }
  }

  /**
   * 播放指定动画
   * @param entity 实体
   * @param animationName 动画名称
   * @param restart 是否从头开始播放 (默认: true)
   */
  play(
    entity: GameEntity & { animation?: Animation },
    animationName: string,
    restart = true
  ): void {
    if (!entity.animation) {
      console.warn('Entity does not have an animation component');
      return;
    }

    if (!entity.animation.animations[animationName]) {
      console.warn(`Animation "${animationName}" not found`);
      return;
    }

    // 如果是同一个动画且不需要重新开始，则直接返回
    if (entity.animation.current === animationName && !restart && entity.animation.playing) {
      return;
    }

    entity.animation.current = animationName;
    entity.animation.playing = true;

    if (restart) {
      entity.animation.frameIndex = 0;
      entity.animation.time = 0;
    }
  }

  /**
   * 暂停动画
   */
  pause(entity: GameEntity & { animation?: Animation }): void {
    if (entity.animation) {
      entity.animation.playing = false;
    }
  }

  /**
   * 恢复动画
   */
  resume(entity: GameEntity & { animation?: Animation }): void {
    if (entity.animation) {
      entity.animation.playing = true;
    }
  }

  /**
   * 停止动画 (回到第一帧)
   */
  stop(entity: GameEntity & { animation?: Animation }): void {
    if (entity.animation) {
      entity.animation.playing = false;
      entity.animation.frameIndex = 0;
      entity.animation.time = 0;
    }
  }

  /**
   * 设置播放速度
   */
  setSpeed(entity: GameEntity & { animation?: Animation }, speed: number): void {
    if (entity.animation) {
      entity.animation.speed = speed;
    }
  }
}
