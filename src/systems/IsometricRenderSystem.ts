/**
 * 等距渲染系统
 *
 * 与 IsometricSystem 配合使用，负责实际的渲染工作
 * 支持深度排序、阴影、精灵渲染等
 */

import { System } from '../core/System';
import type { GameEntity } from '../core/Entity';
import { IsometricSystem, type IsometricTransform, type IsometricSprite } from './IsometricSystem';

/** 渲染层配置 */
export interface RenderLayer {
  name: string;
  zIndex: number;
  entities: GameEntity[];
}

/**
 * 等距渲染系统
 */
export class IsometricRenderSystem extends System {
  static priority = 100; // 在其他系统之后渲染

  private iso!: IsometricSystem;

  /** 是否显示调试信息 */
  showDebug = false;

  /** 是否显示网格 */
  showGrid = false;

  /** 网格范围 */
  gridRange = { startX: -10, startY: -10, cols: 20, rows: 20 };

  onCreate(): void {
    this.iso = this.engine.system(IsometricSystem);
    if (!this.iso) {
      console.warn('IsometricRenderSystem requires IsometricSystem');
    }
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    if (!this.iso) return;

    // 1. 绘制地面网格（如果启用）
    if (this.showGrid) {
      this.iso.drawGrid(
        ctx,
        this.gridRange.startX,
        this.gridRange.startY,
        this.gridRange.cols,
        this.gridRange.rows,
        {
          lineColor: 'rgba(255, 255, 255, 0.15)',
          fillColor: 'rgba(30, 30, 50, 0.5)',
        }
      );
    }

    // 2. 获取排序后的实体
    const sortedEntities = this.iso.getSortedEntities();

    // 3. 第一遍：绘制所有阴影
    for (const { entity } of sortedEntities) {
      this.renderShadow(ctx, entity);
    }

    // 4. 第二遍：绘制所有实体
    for (const { entity, screenX, screenY } of sortedEntities) {
      this.renderEntity(ctx, entity, screenX, screenY);
    }

    // 5. 调试信息
    if (this.showDebug) {
      this.renderDebugInfo(ctx, sortedEntities);
    }
  }

  /**
   * 渲染单个实体的阴影
   */
  private renderShadow(ctx: CanvasRenderingContext2D, entity: GameEntity): void {
    const transform = entity.transform as IsometricTransform | undefined;
    const sprite = entity.sprite as unknown as IsometricSprite | undefined;

    if (!transform || !sprite || !sprite.visible || !sprite.castShadow) return;

    const z = transform.z ?? 0;
    if (z <= 0) return; // 在地面上的物体不需要阴影

    // 计算阴影大小
    const shadowRadius = (sprite.width / 2) * sprite.shadowScale / this.iso.config.tileWidth;

    this.iso.drawShadow(ctx, transform.x, transform.y, z, shadowRadius);
  }

  /**
   * 渲染单个实体
   */
  private renderEntity(
    ctx: CanvasRenderingContext2D,
    entity: GameEntity,
    screenX: number,
    screenY: number
  ): void {
    const transform = entity.transform as IsometricTransform | undefined;
    const sprite = entity.sprite as unknown as IsometricSprite | undefined;

    if (!transform || !sprite || !sprite.visible) return;

    // 检查是否在屏幕内
    if (!this.iso.isOnScreen(screenX, screenY, Math.max(sprite.width, sprite.height))) {
      return;
    }

    ctx.save();

    // 计算渲染位置（考虑锚点）
    // 注：锚点偏移在默认渲染中使用，自定义渲染需自行处理
    ctx.translate(screenX, screenY);

    // 应用变换
    if (transform.rotation) {
      ctx.rotate(transform.rotation);
    }
    if (transform.scaleX !== 1 || transform.scaleY !== 1) {
      ctx.scale(transform.scaleX, transform.scaleY);
    }

    // 透明度
    if (sprite.alpha < 1) {
      ctx.globalAlpha = sprite.alpha;
    }

    // 自定义渲染或默认渲染
    if (sprite.render) {
      ctx.translate(-screenX, -screenY);
      sprite.render(ctx, entity, this.iso);
    } else {
      // 默认：绘制一个简单的形状
      this.renderDefaultSprite(ctx, sprite);
    }

    ctx.restore();
  }

  /**
   * 默认精灵渲染
   */
  private renderDefaultSprite(ctx: CanvasRenderingContext2D, sprite: IsometricSprite): void {
    const halfW = sprite.width / 2;
    const halfH = sprite.height / 2;

    if (sprite.color) {
      // 简单的菱形（等距方块顶面）
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.moveTo(0, -halfH);
      ctx.lineTo(halfW, 0);
      ctx.lineTo(0, halfH);
      ctx.lineTo(-halfW, 0);
      ctx.closePath();
      ctx.fill();

      // 边框
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * 渲染调试信息
   */
  private renderDebugInfo(
    ctx: CanvasRenderingContext2D,
    sortedEntities: Array<{ entity: GameEntity; depth: number; screenX: number; screenY: number }>
  ): void {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    for (const { entity, depth, screenX, screenY } of sortedEntities) {
      const transform = entity.transform as IsometricTransform | undefined;
      if (!transform) continue;

      // 绘制坐标信息
      ctx.fillStyle = '#ffff00';
      ctx.fillText(
        `(${transform.x.toFixed(1)}, ${transform.y.toFixed(1)}, ${(transform.z ?? 0).toFixed(1)})`,
        screenX + 5,
        screenY - 5
      );

      // 绘制深度值
      ctx.fillStyle = '#00ffff';
      ctx.fillText(`d:${depth.toFixed(2)}`, screenX + 5, screenY + 10);

      // 绘制锚点
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(screenX - 2, screenY - 2, 4, 4);
    }

    // 绘制摄像机信息
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`Camera: (${this.iso.cameraX.toFixed(0)}, ${this.iso.cameraY.toFixed(0)})`, 10, 20);
    ctx.fillText(`Zoom: ${this.iso.cameraZoom.toFixed(2)}`, 10, 35);
    ctx.fillText(`Entities: ${sortedEntities.length}`, 10, 50);

    ctx.restore();
  }

  /**
   * 绘制等距方块实体（便捷方法）
   */
  drawBox(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number,
    size: number,
    height: number,
    color: string
  ): void {
    // 调整颜色生成三个面
    const topColor = color;
    const leftColor = this.darkenColor(color, 0.8);
    const rightColor = this.darkenColor(color, 0.6);

    this.iso.drawIsometricBox(ctx, worldX, worldY, worldZ, size, size, height, {
      topColor,
      leftColor,
      rightColor,
    });
  }

  /**
   * 绘制等距角色（便捷方法）
   */
  drawCharacter(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number,
    radius: number,
    height: number,
    color: string
  ): void {
    // 先画阴影
    this.iso.drawShadow(ctx, worldX, worldY, worldZ, radius);

    // 再画角色
    this.iso.drawIsometricCylinder(ctx, worldX, worldY, worldZ, radius, height, {
      topColor: color,
      bodyColor: this.darkenColor(color, 0.7),
      bodyGradient: true,
    });
  }

  /**
   * 颜色变暗
   */
  private darkenColor(color: string, factor: number): string {
    if (color.startsWith('#') && color.length === 7) {
      const r = Math.floor(parseInt(color.slice(1, 3), 16) * factor);
      const g = Math.floor(parseInt(color.slice(3, 5), 16) * factor);
      const b = Math.floor(parseInt(color.slice(5, 7), 16) * factor);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
  }
}
