/**
 * 渲染系统
 * 负责绘制所有带 sprite 组件的实体
 */

import type { GameEntity } from '../core/Entity';
import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';

export class RenderSystem extends System {
  static phase = SystemPhase.Render; // 渲染执行：绘制所有实体

  /** 是否显示调试信息 */
  showDebug = false;

  /** 是否显示碰撞体 */
  showColliders = false;

  onRender(ctx: CanvasRenderingContext2D): void {
    const entities = this.engine.world.entities;

    // 按 z-index 排序（如果有的话）
    const sortedEntities = [...entities].sort((a, b) => {
      const za = (a as GameEntity & { zIndex?: number }).zIndex ?? 0;
      const zb = (b as GameEntity & { zIndex?: number }).zIndex ?? 0;
      return za - zb;
    });

    // 渲染所有实体
    for (const entity of sortedEntities) {
      this.renderEntity(ctx, entity);
    }

    // 调试模式
    if (this.showDebug || this.showColliders) {
      for (const entity of sortedEntities) {
        this.renderDebug(ctx, entity);
      }
    }
  }

  private renderEntity(ctx: CanvasRenderingContext2D, entity: GameEntity): void {
    const { transform, sprite } = entity;

    // 没有精灵或不可见
    if (!sprite || !sprite.visible) return;

    // 没有位置信息
    if (!transform) return;

    ctx.save();

    // 变换
    ctx.translate(transform.x, transform.y);
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

    // 自定义渲染
    if (sprite.render) {
      sprite.render(ctx, entity);
    } else if (sprite.color) {
      // 默认颜色填充
      ctx.fillStyle = sprite.color;
      ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
    }

    ctx.restore();
  }

  private renderDebug(ctx: CanvasRenderingContext2D, entity: GameEntity): void {
    const { transform, collider } = entity;

    if (!transform) return;

    ctx.save();
    ctx.translate(transform.x, transform.y);

    // 绘制碰撞体
    if (this.showColliders && collider) {
      ctx.strokeStyle = collider.isTrigger ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 1;

      const ox = collider.offsetX ?? 0;
      const oy = collider.offsetY ?? 0;

      if (collider.type === 'circle' && collider.radius) {
        ctx.beginPath();
        ctx.arc(ox, oy, collider.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (collider.type === 'rect' && collider.width && collider.height) {
        ctx.strokeRect(
          ox - collider.width / 2,
          oy - collider.height / 2,
          collider.width,
          collider.height
        );
      }
    }

    // 绘制原点
    if (this.showDebug) {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-2, -2, 4, 4);

      // 绘制 ID
      if (entity.id) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(entity.id, 5, -5);
      }
    }

    ctx.restore();
  }

  /**
   * 绘制圆形
   */
  static drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    options: {
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    } = {}
  ): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (options.fill) {
      ctx.fillStyle = options.fill;
      ctx.fill();
    }

    if (options.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.lineWidth = options.lineWidth ?? 1;
      ctx.stroke();
    }
  }

  /**
   * 绘制矩形
   */
  static drawRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      fill?: string;
      stroke?: string;
      lineWidth?: number;
      centered?: boolean;
    } = {}
  ): void {
    const drawX = options.centered ? x - width / 2 : x;
    const drawY = options.centered ? y - height / 2 : y;

    if (options.fill) {
      ctx.fillStyle = options.fill;
      ctx.fillRect(drawX, drawY, width, height);
    }

    if (options.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.lineWidth = options.lineWidth ?? 1;
      ctx.strokeRect(drawX, drawY, width, height);
    }
  }

  /**
   * 绘制线条
   */
  static drawLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: {
      color?: string;
      lineWidth?: number;
      dash?: number[];
    } = {}
  ): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = options.color ?? '#fff';
    ctx.lineWidth = options.lineWidth ?? 1;

    if (options.dash) {
      ctx.setLineDash(options.dash);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * 绘制文本
   */
  static drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: {
      font?: string;
      color?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
      stroke?: string;
      strokeWidth?: number;
    } = {}
  ): void {
    ctx.font = options.font ?? '16px sans-serif';
    ctx.textAlign = options.align ?? 'left';
    ctx.textBaseline = options.baseline ?? 'top';

    if (options.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.lineWidth = options.strokeWidth ?? 2;
      ctx.strokeText(text, x, y);
    }

    ctx.fillStyle = options.color ?? '#fff';
    ctx.fillText(text, x, y);
  }
}
