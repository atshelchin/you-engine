/**
 * Isometric Components - 等距视角组件
 *
 * 革命性设计：
 * 1. 完全集成到 Node 系统
 * 2. 自动处理 2D → 等距 转换
 * 3. 策划师无感知
 */

import { Component } from '../core/Component';
import type { Node } from '../core/Node';

// ==================== 等距视角配置 ====================

export interface IsometricConfig {
  tileWidth?: number; // 瓦片宽度
  tileHeight?: number; // 瓦片高度
  cameraX?: number; // 摄像机 X
  cameraY?: number; // 摄像机 Y
  zoom?: number; // 缩放
}

// ==================== 等距视角系统组件 ====================

/**
 * IsometricView - 等距视角组件
 *
 * 挂载到场景根节点，自动转换所有子节点的坐标
 */
export class IsometricView extends Component {
  tileWidth: number;
  tileHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;

  constructor(config: IsometricConfig = {}) {
    super();
    this.tileWidth = config.tileWidth || 64;
    this.tileHeight = config.tileHeight || 32;
    this.cameraX = config.cameraX || 0;
    this.cameraY = config.cameraY || 0;
    this.zoom = config.zoom || 1;
  }

  /**
   * 世界坐标 → 屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number, worldZ: number = 0): { x: number; y: number } {
    const screenX = (worldX - worldY) * (this.tileWidth / 2) * this.zoom;
    const screenY =
      (worldX + worldY) * (this.tileHeight / 2) * this.zoom - worldZ * this.tileHeight * this.zoom;
    return {
      x: screenX - this.cameraX * this.zoom,
      y: screenY - this.cameraY * this.zoom,
    };
  }

  /**
   * 屏幕坐标 → 世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const adjustedX = screenX + this.cameraX * this.zoom;
    const adjustedY = screenY + this.cameraY * this.zoom;

    const worldX =
      (adjustedX / (this.tileWidth / 2) + adjustedY / (this.tileHeight / 2)) / 2 / this.zoom;
    const worldY =
      (adjustedY / (this.tileHeight / 2) - adjustedX / (this.tileWidth / 2)) / 2 / this.zoom;

    return { x: worldX, y: worldY };
  }

  /**
   * 设置摄像机位置
   */
  setCamera(x: number, y: number): void {
    this.cameraX = x;
    this.cameraY = y;
  }

  /**
   * 跟随节点
   */
  follow(target: Node, smoothness: number = 0.1): void {
    const screen = this.worldToScreen(target.x, target.y, target.z);
    this.cameraX += (screen.x - this.cameraX) * smoothness;
    this.cameraY += (screen.y - this.cameraY) * smoothness;
  }

  /**
   * 设置缩放
   */
  setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  onRender(_ctx: CanvasRenderingContext2D): void {
    // 等距视角组件本身不渲染，但会影响子节点的渲染
    // 通过 IsometricRenderer 组件来应用变换
  }
}

// ==================== 等距渲染器（自动应用变换）====================

/**
 * IsometricRenderer - 等距渲染包装器
 *
 * 自动将节点的 2D 坐标转换为等距屏幕坐标
 */
export class IsometricRenderer extends Component {
  private renderer: Component;

  constructor(renderer: Component) {
    super();
    this.renderer = renderer;
  }

  onInit(): void {
    this.renderer.node = this.node;
    this.renderer.onInit?.();
  }

  onUpdate(dt: number): void {
    this.renderer.onUpdate?.(dt);
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    // 查找等距视角组件
    const isoView = this.findIsometricView(this.node);
    if (!isoView) {
      // 没有等距视角，直接渲染
      this.renderer.onRender?.(ctx);
      return;
    }

    // 应用等距变换
    ctx.save();

    const screen = isoView.worldToScreen(this.node.x, this.node.y, this.node.z);
    ctx.translate(screen.x, screen.y);

    // 渲染
    this.renderer.onRender?.(ctx);

    ctx.restore();
  }

  private findIsometricView(node: Node): IsometricView | null {
    // 向上查找等距视角组件
    let current: Node | null = node;
    while (current) {
      const comp = current.getComponent(IsometricView);
      if (comp) return comp;
      current = current.getParent();
    }
    return null;
  }
}

// ==================== 等距瓦片渲染器 ====================

export interface IsometricTileConfig {
  color: string;
  stroke?: string;
  strokeWidth?: number;
}

/**
 * IsometricTile - 等距瓦片渲染器
 */
export class IsometricTile extends Component {
  color: string;
  stroke?: string;
  strokeWidth: number;

  constructor(config: IsometricTileConfig) {
    super();
    this.color = config.color;
    this.stroke = config.stroke;
    this.strokeWidth = config.strokeWidth || 1;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const isoView = this.findIsometricView(this.node);
    if (!isoView) return;

    const tileWidth = isoView.tileWidth;
    const tileHeight = isoView.tileHeight;

    // 等距瓦片的四个角
    ctx.beginPath();
    ctx.moveTo(0, -tileHeight / 2);
    ctx.lineTo(tileWidth / 2, 0);
    ctx.lineTo(0, tileHeight / 2);
    ctx.lineTo(-tileWidth / 2, 0);
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }

  private findIsometricView(node: Node): IsometricView | null {
    let current: Node | null = node;
    while (current) {
      const comp = current.getComponent(IsometricView);
      if (comp) return comp;
      current = current.getParent();
    }
    return null;
  }
}
