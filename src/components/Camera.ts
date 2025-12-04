/**
 * Camera Component - 相机组件
 *
 * 支持动态相机、跟随、缩放、震动等效果
 */

import { Component } from '../core/Component';
import type { Node } from '../core/Node';

// ==================== 相机组件 ====================

export interface CameraConfig {
  // 视口大小
  viewportWidth?: number;
  viewportHeight?: number;

  // 初始位置和缩放
  x?: number;
  y?: number;
  zoom?: number;

  // 边界限制
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };

  // 缩放限制
  minZoom?: number;
  maxZoom?: number;
}

export class Camera extends Component {
  // 相机位置
  x: number;
  y: number;
  rotation: number;
  zoom: number;

  // 视口
  viewportWidth: number;
  viewportHeight: number;

  // 边界
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;

  // 缩放限制
  minZoom: number;
  maxZoom: number;

  // 跟随目标
  private followTarget: Node | null = null;
  private followSmoothness = 0.1;
  private followOffset = { x: 0, y: 0 };

  // 相机震动
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeOffset = { x: 0, y: 0 };

  constructor(config: CameraConfig = {}) {
    super();

    this.x = config.x || 0;
    this.y = config.y || 0;
    this.rotation = 0;
    this.zoom = config.zoom || 1.0;

    this.viewportWidth = config.viewportWidth || 800;
    this.viewportHeight = config.viewportHeight || 600;

    this.bounds = config.bounds
      ? {
          minX: config.bounds.minX ?? -Infinity,
          maxX: config.bounds.maxX ?? Infinity,
          minY: config.bounds.minY ?? -Infinity,
          maxY: config.bounds.maxY ?? Infinity,
        }
      : null;

    this.minZoom = config.minZoom || 0.1;
    this.maxZoom = config.maxZoom || 5.0;
  }

  // ==================== 跟随 ====================

  /**
   * 跟随一个目标节点
   *
   * @param target 目标节点
   * @param smoothness 平滑度 (0-1, 0=瞬间, 1=不动)
   * @param offsetX X 轴偏移
   * @param offsetY Y 轴偏移
   */
  follow(target: Node, smoothness: number = 0.1, offsetX: number = 0, offsetY: number = 0): void {
    this.followTarget = target;
    this.followSmoothness = Math.max(0, Math.min(1, smoothness));
    this.followOffset.x = offsetX;
    this.followOffset.y = offsetY;
  }

  /**
   * 停止跟随
   */
  stopFollow(): void {
    this.followTarget = null;
  }

  // ==================== 震动 ====================

  /**
   * 震动相机
   *
   * @param intensity 强度 (像素)
   * @param duration 持续时间 (秒)
   */
  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  // ==================== 缩放 ====================

  /**
   * 设置缩放
   */
  setZoom(zoom: number, smooth: boolean = false): void {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

    if (smooth) {
      // 平滑缩放（在 onUpdate 中处理）
      this.targetZoom = newZoom;
    } else {
      this.zoom = newZoom;
    }
  }

  /**
   * 放大
   */
  zoomIn(amount: number = 0.1): void {
    this.setZoom(this.zoom + amount, true);
  }

  /**
   * 缩小
   */
  zoomOut(amount: number = 0.1): void {
    this.setZoom(this.zoom - amount, true);
  }

  private targetZoom: number | null = null;

  // ==================== 位置控制 ====================

  /**
   * 移动到指定位置
   */
  moveTo(x: number, y: number, smooth: boolean = false): void {
    if (smooth) {
      this.targetPosition = { x, y };
    } else {
      this.x = x;
      this.y = y;
      this.applyBounds();
    }
  }

  /**
   * 居中到某个点
   */
  centerOn(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  private targetPosition: { x: number; y: number } | null = null;

  // ==================== 更新 ====================

  onUpdate(dt: number): void {
    // 跟随目标
    if (this.followTarget) {
      const targetX = this.followTarget.x + this.followOffset.x;
      const targetY = this.followTarget.y + this.followOffset.y;

      // 平滑插值
      this.x += (targetX - this.x) * (1 - this.followSmoothness);
      this.y += (targetY - this.y) * (1 - this.followSmoothness);
    }

    // 平滑移动到目标位置
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.x;
      const dy = this.targetPosition.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        this.x = this.targetPosition.x;
        this.y = this.targetPosition.y;
        this.targetPosition = null;
      } else {
        this.x += dx * 0.1;
        this.y += dy * 0.1;
      }
    }

    // 平滑缩放
    if (this.targetZoom !== null) {
      const diff = this.targetZoom - this.zoom;
      if (Math.abs(diff) < 0.01) {
        this.zoom = this.targetZoom;
        this.targetZoom = null;
      } else {
        this.zoom += diff * 0.1;
      }
    }

    // 应用边界
    this.applyBounds();

    // 更新震动
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;

      // 随机偏移
      const angle = Math.random() * Math.PI * 2;
      this.shakeOffset.x = Math.cos(angle) * this.shakeIntensity;
      this.shakeOffset.y = Math.sin(angle) * this.shakeIntensity;

      // 衰减
      this.shakeIntensity *= 0.9;

      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    }
  }

  // ==================== 坐标转换 ====================

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    const x = (worldX - this.x + this.shakeOffset.x) * this.zoom + cx;
    const y = (worldY - this.y + this.shakeOffset.y) * this.zoom + cy;

    return { x, y };
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    const x = (screenX - cx) / this.zoom + this.x - this.shakeOffset.x;
    const y = (screenY - cy) / this.zoom + this.y - this.shakeOffset.y;

    return { x, y };
  }

  /**
   * 获取相机视野范围
   */
  getViewBounds(): { left: number; right: number; top: number; bottom: number } {
    const halfWidth = this.viewportWidth / (2 * this.zoom);
    const halfHeight = this.viewportHeight / (2 * this.zoom);

    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight,
    };
  }

  // ==================== 私有方法 ====================

  private applyBounds(): void {
    if (!this.bounds) return;

    if (this.bounds.minX !== -Infinity && this.x < this.bounds.minX) {
      this.x = this.bounds.minX;
    }
    if (this.bounds.maxX !== Infinity && this.x > this.bounds.maxX) {
      this.x = this.bounds.maxX;
    }
    if (this.bounds.minY !== -Infinity && this.y < this.bounds.minY) {
      this.y = this.bounds.minY;
    }
    if (this.bounds.maxY !== Infinity && this.y > this.bounds.maxY) {
      this.y = this.bounds.maxY;
    }
  }

  /**
   * 应用相机变换到 canvas 上下文
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    ctx.translate(cx, cy);
    ctx.scale(this.zoom, this.zoom);
    ctx.rotate(this.rotation);
    ctx.translate(-this.x + this.shakeOffset.x, -this.y + this.shakeOffset.y);
  }
}

// ==================== 使用示例 ====================

/*
// 1. 基本相机
const camera = root.addComponent(Camera, {
  viewportWidth: 800,
  viewportHeight: 600,
  zoom: 1.0
});

// 2. 跟随玩家
camera.follow(player, 0.1);

// 3. 相机震动（爆炸、攻击等）
camera.shake(10, 0.5);  // 强度10像素，持续0.5秒

// 4. 缩放控制
camera.zoomIn(0.1);     // 放大
camera.zoomOut(0.1);    // 缩小
camera.setZoom(2.0);    // 设置到2倍

// 5. 边界限制
const camera = root.addComponent(Camera, {
  bounds: {
    minX: 0,
    maxX: 1600,  // 地图宽度
    minY: 0,
    maxY: 640    // 地图高度
  }
});

// 6. 在渲染时应用相机变换
onRender(ctx) {
  const camera = root.getComponent(Camera);
  if (camera) {
    ctx.save();
    camera.applyTransform(ctx);

    // 渲染世界...

    ctx.restore();
  }
}
*/
