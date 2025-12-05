/**
 * 摄像机系统
 * 支持震屏、缩放、跟随、闪屏效果
 */

import type { GameEntity } from '../core/Entity';
import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';
import { damp, lerp } from '../utils/math';

export interface CameraConfig {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export class CameraSystem extends System {
  static phase = SystemPhase.Early; // 早期执行：更新摄像机

  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  zoom = 1;
  targetZoom = 1;
  rotation = 0;

  /** 震屏 */
  shakeIntensity = 0;
  private shakeX = 0;
  private shakeY = 0;
  private shakeDecay = 0.9;

  /** 跟随 */
  private followTarget: GameEntity | null = null;
  private followSmoothing = 0.1;
  private followOffsetX = 0;
  private followOffsetY = 0;

  /** 闪屏 */
  private flashColor = '#fff';
  private flashAlpha = 0;
  private flashDuration = 0;
  private flashTimer = 0;

  /** 边界 */
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  onCreate(): void {
    // 初始化默认位置：使世界坐标 (0,0) 对应屏幕左上角
    this.x = this.targetX = this.engine.width / 2;
    this.y = this.targetY = this.engine.height / 2;
  }

  onUpdate(dt: number): void {
    // 跟随目标
    if (this.followTarget?.transform) {
      this.targetX = this.followTarget.transform.x + this.followOffsetX;
      this.targetY = this.followTarget.transform.y + this.followOffsetY;
    }

    // 平滑移动
    this.x = damp(this.x, this.targetX, this.followSmoothing * 10, dt / 1000);
    this.y = damp(this.y, this.targetY, this.followSmoothing * 10, dt / 1000);
    this.zoom = lerp(this.zoom, this.targetZoom, 0.1);

    // 边界限制
    if (this.bounds) {
      this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
      this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
    }

    // 震屏
    if (this.shakeIntensity > 0.5) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeX = this.shakeY = this.shakeIntensity = 0;
    }

    // 闪屏
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.flashAlpha = Math.max(0, this.flashTimer / this.flashDuration);
    }
  }

  onPreRender(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.engine;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.zoom, this.zoom);
    if (this.rotation !== 0) ctx.rotate(this.rotation);
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  onPostRender(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, this.engine.width, this.engine.height);
      ctx.globalAlpha = 1;
    }
  }

  shake(intensity = 10, decay = 0.9): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = decay;
  }

  flash(color = '#fff', duration = 100, alpha = 0.8): void {
    this.flashColor = color;
    this.flashDuration = duration;
    this.flashTimer = duration;
    this.flashAlpha = alpha;
  }

  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  setPosition(x: number, y: number): void {
    this.x = this.targetX = x;
    this.y = this.targetY = y;
  }

  follow(target: GameEntity | null, smoothing = 0.1, offsetX = 0, offsetY = 0): void {
    this.followTarget = target;
    this.followSmoothing = smoothing;
    this.followOffsetX = offsetX;
    this.followOffsetY = offsetY;
  }

  unfollow(): void {
    this.followTarget = null;
  }

  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.bounds = { minX, minY, maxX, maxY };
  }

  clearBounds(): void {
    this.bounds = null;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const { width, height } = this.engine;
    return {
      x: (screenX - width / 2) / this.zoom + this.x,
      y: (screenY - height / 2) / this.zoom + this.y,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const { width, height } = this.engine;
    return {
      x: (worldX - this.x) * this.zoom + width / 2,
      y: (worldY - this.y) * this.zoom + height / 2,
    };
  }

  isInView(x: number, y: number, margin = 0): boolean {
    const { width, height } = this.engine;
    const hw = width / 2 / this.zoom + margin;
    const hh = height / 2 / this.zoom + margin;
    return x >= this.x - hw && x <= this.x + hw && y >= this.y - hh && y <= this.y + hh;
  }

  getViewBounds(): { left: number; right: number; top: number; bottom: number } {
    const { width, height } = this.engine;
    const hw = width / 2 / this.zoom;
    const hh = height / 2 / this.zoom;
    return { left: this.x - hw, right: this.x + hw, top: this.y - hh, bottom: this.y + hh };
  }

  reset(): void {
    this.x = this.y = this.targetX = this.targetY = 0;
    this.zoom = this.targetZoom = 1;
    this.rotation = this.shakeIntensity = this.flashAlpha = 0;
    this.followTarget = null;
  }
}
