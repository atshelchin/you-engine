/**
 * Renderer Components - 渲染组件族
 *
 * 提供各种渲染能力，但对策划师隐藏实现细节
 */

import { Component } from '../core/Component';

// ==================== 圆形渲染器 ====================

export interface CircleConfig {
  radius: number;
  color: string;
  stroke?: string;
  strokeWidth?: number;
}

export class CircleRenderer extends Component {
  radius: number;
  color: string;
  stroke?: string;
  strokeWidth: number;

  constructor(config: CircleConfig) {
    super();
    this.radius = config.radius;
    this.color = config.color;
    this.stroke = config.stroke;
    this.strokeWidth = config.strokeWidth || 1;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }
}

// ==================== 矩形渲染器 ====================

export interface RectConfig {
  width: number;
  height: number;
  color: string;
  stroke?: string;
  strokeWidth?: number;
}

export class RectRenderer extends Component {
  width: number;
  height: number;
  color: string;
  stroke?: string;
  strokeWidth: number;

  constructor(config: RectConfig) {
    super();
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.stroke = config.stroke;
    this.strokeWidth = config.strokeWidth || 1;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const x = -this.width / 2;
    const y = -this.height / 2;

    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, this.width, this.height);

    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeRect(x, y, this.width, this.height);
    }
  }
}

// ==================== 精灵渲染器 ====================

export interface SpriteConfig {
  image: HTMLImageElement | HTMLCanvasElement;
  width?: number;
  height?: number;
  anchorX?: number; // 0-1, 0.5 = center
  anchorY?: number; // 0-1, 0.5 = center
  opacity?: number; // 0-1
  flipX?: boolean;
  flipY?: boolean;
}

export class SpriteRenderer extends Component {
  image: HTMLImageElement | HTMLCanvasElement;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;

  constructor(config: SpriteConfig) {
    super();
    this.image = config.image;
    this.width = config.width || this.image.width;
    this.height = config.height || this.image.height;
    this.anchorX = config.anchorX ?? 0.5; // 默认居中
    this.anchorY = config.anchorY ?? 0.5;
    this.opacity = config.opacity ?? 1.0;
    this.flipX = config.flipX || false;
    this.flipY = config.flipY || false;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const x = -this.width * this.anchorX;
    const y = -this.height * this.anchorY;

    ctx.save();

    // 透明度
    if (this.opacity < 1.0) {
      ctx.globalAlpha = this.opacity;
    }

    // 翻转
    if (this.flipX || this.flipY) {
      ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    }

    ctx.drawImage(this.image, x, y, this.width, this.height);
    ctx.restore();
  }
}

// ==================== 精灵动画渲染器 ====================

export interface AnimationConfig {
  frames: number[]; // 帧索引数组
  fps: number; // 每秒帧数
  loop?: boolean; // 是否循环
}

export interface AnimatedSpriteConfig {
  spriteSheet: HTMLImageElement | HTMLCanvasElement;
  frameWidth: number; // 单帧宽度
  frameHeight: number; // 单帧高度
  animations: Record<string, AnimationConfig>;
  defaultAnimation?: string;
  anchorX?: number;
  anchorY?: number;
}

export class AnimatedSprite extends Component {
  spriteSheet: HTMLImageElement | HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, AnimationConfig>;
  anchorX: number;
  anchorY: number;

  private currentAnimation: string;
  private currentFrame = 0;
  private frameTime = 0;
  private isPlaying = true;

  constructor(config: AnimatedSpriteConfig) {
    super();
    this.spriteSheet = config.spriteSheet;
    this.frameWidth = config.frameWidth;
    this.frameHeight = config.frameHeight;
    this.animations = config.animations;
    this.anchorX = config.anchorX ?? 0.5;
    this.anchorY = config.anchorY ?? 0.5;

    // 设置默认动画
    this.currentAnimation = config.defaultAnimation || Object.keys(config.animations)[0];
  }

  play(animationName: string): void {
    if (this.currentAnimation !== animationName) {
      this.currentAnimation = animationName;
      this.currentFrame = 0;
      this.frameTime = 0;
    }
    this.isPlaying = true;
  }

  stop(): void {
    this.isPlaying = false;
  }

  pause(): void {
    this.isPlaying = false;
  }

  resume(): void {
    this.isPlaying = true;
  }

  onUpdate(dt: number): void {
    if (!this.isPlaying) return;

    const anim = this.animations[this.currentAnimation];
    if (!anim) return;

    const frameDuration = 1 / anim.fps;
    this.frameTime += dt;

    if (this.frameTime >= frameDuration) {
      this.frameTime -= frameDuration;
      this.currentFrame++;

      if (this.currentFrame >= anim.frames.length) {
        if (anim.loop !== false) {
          // 默认循环
          this.currentFrame = 0;
        } else {
          this.currentFrame = anim.frames.length - 1;
          this.isPlaying = false;
        }
      }
    }
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const anim = this.animations[this.currentAnimation];
    if (!anim) return;

    const frameIndex = anim.frames[this.currentFrame];
    const cols = Math.floor(this.spriteSheet.width / this.frameWidth);

    // 计算源坐标
    const sx = (frameIndex % cols) * this.frameWidth;
    const sy = Math.floor(frameIndex / cols) * this.frameHeight;

    // 计算目标坐标
    const dx = -this.frameWidth * this.anchorX;
    const dy = -this.frameHeight * this.anchorY;

    ctx.drawImage(
      this.spriteSheet,
      sx,
      sy,
      this.frameWidth,
      this.frameHeight,
      dx,
      dy,
      this.frameWidth,
      this.frameHeight
    );
  }
}

// ==================== 文本渲染器 ====================

export interface TextConfig {
  text: string | (() => string);
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

export class TextRenderer extends Component {
  text: string | (() => string);
  font: string;
  color: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;

  constructor(config: TextConfig) {
    super();
    this.text = config.text;
    this.font = config.font || '16px Arial';
    this.color = config.color || '#ffffff';
    this.align = config.align || 'center';
    this.baseline = config.baseline || 'middle';
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const text = typeof this.text === 'function' ? this.text() : this.text;

    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;
    ctx.fillText(text, 0, 0);
  }
}
