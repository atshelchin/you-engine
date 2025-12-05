/**
 * 摄像机系统
 * 支持震屏、缩放、跟随、闪屏效果
 */

import type { GameEntity } from '../core/Entity';
import { System } from '../core/System';
import { damp, lerp } from '../math/MathUtils';

export interface CameraConfig {
  /** 摄像机 X 位置 */
  x: number;
  /** 摄像机 Y 位置 */
  y: number;
  /** 缩放 */
  zoom: number;
  /** 旋转（弧度） */
  rotation: number;
}

export class CameraSystem extends System {
  static priority = -50; // 在渲染之前

  /** 摄像机位置 */
  x = 0;
  y = 0;

  /** 目标位置（用于平滑跟随） */
  targetX = 0;
  targetY = 0;

  /** 缩放 */
  zoom = 1;
  targetZoom = 1;

  /** 旋转 */
  rotation = 0;

  /** 震屏强度 */
  private shakeIntensity = 0;
  private shakeX = 0;
  private shakeY = 0;
  private shakeDecay = 0.9;

  /** 跟随目标 */
  private followTarget: GameEntity | null = null;
  private followSmoothing = 0.1;
  private followOffsetX = 0;
  private followOffsetY = 0;

  /** 闪屏效果 */
  private flashColor = '#fff';
  private flashAlpha = 0;
  private flashDuration = 0;
  private flashTimer = 0;

  /** 边界限制 */
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  onUpdate(dt: number): void {
    // 更新跟随
    if (this.followTarget?.transform) {
      this.targetX = this.followTarget.transform.x + this.followOffsetX;
      this.targetY = this.followTarget.transform.y + this.followOffsetY;
    }

    // 平滑移动到目标
    this.x = damp(this.x, this.targetX, this.followSmoothing * 10, dt / 1000);
    this.y = damp(this.y, this.targetY, this.followSmoothing * 10, dt / 1000);

    // 平滑缩放
    this.zoom = lerp(this.zoom, this.targetZoom, 0.1);

    // 边界限制
    if (this.bounds) {
      this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
      this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
    }

    // 更新震屏
    if (this.shakeIntensity > 0.5) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeIntensity = 0;
    }

    // 更新闪屏
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.flashAlpha = Math.max(0, this.flashTimer / this.flashDuration);
    }
  }

  onPreRender(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.engine;

    // 应用摄像机变换
    ctx.save();

    // 移动到屏幕中心
    ctx.translate(width / 2, height / 2);

    // 应用缩放
    ctx.scale(this.zoom, this.zoom);

    // 应用旋转
    if (this.rotation !== 0) {
      ctx.rotate(this.rotation);
    }

    // 应用摄像机位置（反向）和震屏
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  onPostRender(ctx: CanvasRenderingContext2D): void {
    // 恢复变换
    ctx.restore();

    // 绘制闪屏效果
    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, this.engine.width, this.engine.height);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * 震屏效果
   */
  shake(options: { intensity?: number; decay?: number } = {}): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, options.intensity ?? 10);
    this.shakeDecay = options.decay ?? 0.9;
  }

  /**
   * 闪屏效果
   */
  flash(options: { color?: string; duration?: number; alpha?: number } = {}): void {
    this.flashColor = options.color ?? '#fff';
    this.flashDuration = options.duration ?? 100;
    this.flashTimer = this.flashDuration;
    this.flashAlpha = options.alpha ?? 0.8;
  }

  /**
   * 缩放到指定值
   */
  zoomTo(zoom: number, _options: { duration?: number } = {}): void {
    this.targetZoom = zoom;
    // TODO: 如果需要缓动效果，可以使用 TweenSystem
  }

  /**
   * 移动到指定位置
   */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * 立即设置位置
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * 跟随实体
   */
  follow(
    target: GameEntity | null,
    options: { smoothing?: number; offsetX?: number; offsetY?: number } = {}
  ): void {
    this.followTarget = target;
    this.followSmoothing = options.smoothing ?? 0.1;
    this.followOffsetX = options.offsetX ?? 0;
    this.followOffsetY = options.offsetY ?? 0;
  }

  /**
   * 停止跟随
   */
  unfollow(): void {
    this.followTarget = null;
  }

  /**
   * 设置边界
   */
  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.bounds = { minX, minY, maxX, maxY };
  }

  /**
   * 清除边界
   */
  clearBounds(): void {
    this.bounds = null;
  }

  /**
   * 将屏幕坐标转换为世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const { width, height } = this.engine;
    return {
      x: (screenX - width / 2) / this.zoom + this.x,
      y: (screenY - height / 2) / this.zoom + this.y,
    };
  }

  /**
   * 将世界坐标转换为屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const { width, height } = this.engine;
    return {
      x: (worldX - this.x) * this.zoom + width / 2,
      y: (worldY - this.y) * this.zoom + height / 2,
    };
  }

  /**
   * 检查点是否在视口内
   */
  isInView(x: number, y: number, margin = 0): boolean {
    const { width, height } = this.engine;
    const hw = width / 2 / this.zoom + margin;
    const hh = height / 2 / this.zoom + margin;
    return x >= this.x - hw && x <= this.x + hw && y >= this.y - hh && y <= this.y + hh;
  }

  /**
   * 获取视口边界
   */
  getViewBounds(): { left: number; right: number; top: number; bottom: number } {
    const { width, height } = this.engine;
    const hw = width / 2 / this.zoom;
    const hh = height / 2 / this.zoom;
    return {
      left: this.x - hw,
      right: this.x + hw,
      top: this.y - hh,
      bottom: this.y + hh,
    };
  }

  /**
   * 重置摄像机
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.rotation = 0;
    this.shakeIntensity = 0;
    this.followTarget = null;
    this.flashAlpha = 0;
  }
}
