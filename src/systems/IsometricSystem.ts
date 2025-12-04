/**
 * 等距视角系统 (Isometric System)
 *
 * 支持经典的2:1等距投影（如红色警戒、暗黑破坏神、帝国时代等）
 *
 * 坐标系说明：
 * - 世界坐标 (worldX, worldY, worldZ): 逻辑坐标，用于游戏逻辑和碰撞
 * - 屏幕坐标 (screenX, screenY): 渲染坐标，用于绘制
 *
 * 等距投影公式 (2:1 比例):
 * screenX = (worldX - worldY) * tileWidth / 2
 * screenY = (worldX + worldY) * tileHeight / 2 - worldZ
 *
 * 反向投影（屏幕到世界，假设 z=0）:
 * worldX = (screenX / (tileWidth/2) + screenY / (tileHeight/2)) / 2
 * worldY = (screenY / (tileHeight/2) - screenX / (tileWidth/2)) / 2
 */

import { System } from '../core/System';
import type { GameEntity } from '../core/Entity';

/** 等距配置 */
export interface IsometricConfig {
  /** 地块宽度（像素），标准等距用 2:1 比例 */
  tileWidth: number;
  /** 地块高度（像素），通常是 tileWidth / 2 */
  tileHeight: number;
  /** 高度单位的像素值（1单位高度 = 多少像素向上偏移） */
  heightScale: number;
  /** 是否启用深度排序 */
  depthSortEnabled: boolean;
  /** 阴影配置 */
  shadow: {
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    /** 阴影随高度的缩放 */
    heightFade: number;
  };
}

/** 等距变换组件 - 扩展基础 Transform */
export interface IsometricTransform {
  /** 世界 X 坐标（等距网格） */
  x: number;
  /** 世界 Y 坐标（等距网格） */
  y: number;
  /** 世界 Z 坐标（高度） */
  z: number;
  /** 旋转（弧度） */
  rotation: number;
  /** X 缩放 */
  scaleX: number;
  /** Y 缩放 */
  scaleY: number;

  // 缓存的屏幕坐标（由系统计算）
  _screenX?: number;
  _screenY?: number;
  _depth?: number;
}

/** 等距精灵组件 */
export interface IsometricSprite {
  /** 精灵宽度 */
  width: number;
  /** 精灵高度 */
  height: number;
  /** 锚点 X (0-1)，默认 0.5（中心） */
  anchorX: number;
  /** 锚点 Y (0-1)，默认 1（底部）- 等距游戏通常锚点在脚底 */
  anchorY: number;
  /** 颜色（如果没有纹理） */
  color?: string;
  /** 纹理 */
  texture?: string;
  /** 透明度 */
  alpha: number;
  /** 是否可见 */
  visible: boolean;
  /** 自定义渲染函数 */
  render?: (ctx: CanvasRenderingContext2D, entity: GameEntity, iso: IsometricSystem) => void;
  /** 是否投射阴影 */
  castShadow: boolean;
  /** 阴影大小（相对于精灵） */
  shadowScale: number;
}

/** 深度排序键 */
export interface DepthKey {
  entity: GameEntity;
  depth: number;
  screenX: number;
  screenY: number;
}

/**
 * 等距视角系统
 */
export class IsometricSystem extends System {
  static priority = -10; // 在渲染之前执行

  /** 配置 */
  config: IsometricConfig = {
    tileWidth: 64,
    tileHeight: 32,
    heightScale: 32,
    depthSortEnabled: true,
    shadow: {
      enabled: true,
      color: 'rgba(0, 0, 0, 0.3)',
      offsetX: 0,
      offsetY: 0,
      blur: 4,
      heightFade: 0.02,
    },
  };

  /** 摄像机偏移（屏幕空间） */
  cameraX = 0;
  cameraY = 0;
  cameraZoom = 1;

  /** 视图旋转角度（弧度），设为 Math.PI/4 (45度) 可以让菱形网格看起来像正方形 */
  viewRotation = 0;

  /** 缓存的排序结果 */
  private sortedEntities: DepthKey[] = [];

  /**
   * 设置配置
   */
  setConfig(config: Partial<IsometricConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.shadow) {
      this.config.shadow = { ...this.config.shadow, ...config.shadow };
    }
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number, worldZ: number = 0): { x: number; y: number } {
    const { tileWidth, tileHeight, heightScale } = this.config;

    // 标准 2:1 等距投影
    let screenX = (worldX - worldY) * (tileWidth / 2);
    let screenY = (worldX + worldY) * (tileHeight / 2) - worldZ * heightScale;

    // 应用视图旋转（让菱形看起来像正方形）
    if (this.viewRotation !== 0) {
      const cos = Math.cos(this.viewRotation);
      const sin = Math.sin(this.viewRotation);
      const rx = screenX * cos - screenY * sin;
      const ry = screenX * sin + screenY * cos;
      screenX = rx;
      screenY = ry;
    }

    // 应用摄像机
    return {
      x: (screenX - this.cameraX) * this.cameraZoom + this.engine.width / 2,
      y: (screenY - this.cameraY) * this.cameraZoom + this.engine.height / 2,
    };
  }

  /**
   * 屏幕坐标转世界坐标（假设 z=0 的地面）
   */
  screenToWorld(screenX: number, screenY: number, worldZ: number = 0): { x: number; y: number } {
    const { tileWidth, tileHeight, heightScale } = this.config;

    // 反向摄像机变换
    let isoX = (screenX - this.engine.width / 2) / this.cameraZoom + this.cameraX;
    let isoY = (screenY - this.engine.height / 2) / this.cameraZoom + this.cameraY;

    // 反向视图旋转
    if (this.viewRotation !== 0) {
      const cos = Math.cos(-this.viewRotation);
      const sin = Math.sin(-this.viewRotation);
      const rx = isoX * cos - isoY * sin;
      const ry = isoX * sin + isoY * cos;
      isoX = rx;
      isoY = ry;
    }

    // 加上高度偏移
    isoY += worldZ * heightScale;

    // 反向等距投影
    const worldX = (isoX / (tileWidth / 2) + isoY / (tileHeight / 2)) / 2;
    const worldY = (isoY / (tileHeight / 2) - isoX / (tileWidth / 2)) / 2;

    return { x: worldX, y: worldY };
  }

  /**
   * 获取网格单元格坐标
   */
  screenToTile(screenX: number, screenY: number): { tileX: number; tileY: number } {
    const world = this.screenToWorld(screenX, screenY);
    return {
      tileX: Math.floor(world.x),
      tileY: Math.floor(world.y),
    };
  }

  /**
   * 计算深度值（用于排序）
   * 深度 = x + y + z * factor
   * 确保后面的物体先绘制，前面的物体后绘制
   */
  calculateDepth(worldX: number, worldY: number, worldZ: number = 0): number {
    // 深度值：Y方向优先，然后是X，最后是高度
    // 数值越大越靠前（后绘制）
    return worldX + worldY + worldZ * 0.001;
  }

  private _debugLogOnce?: boolean;

  /**
   * 更新所有等距实体的屏幕坐标
   */
  onUpdate(_dt: number): void {
    const entities = this.engine.world.entities as GameEntity[];

    // 调试：打印实体信息（只打印一次）
    if (this._debugLogOnce === undefined && entities.length > 0) {
      this._debugLogOnce = true;
      console.log('IsometricSystem.onUpdate: entities count =', entities.length);
      const withTransform = entities.filter(e => e.transform);
      const withSprite = entities.filter(e => e.sprite);
      console.log('  - with transform:', withTransform.length);
      console.log('  - with sprite:', withSprite.length);
      if (entities[0]) {
        console.log('  - first entity:', entities[0].id, entities[0].transform, entities[0].sprite);
      }
    }

    // 清空排序缓存
    this.sortedEntities = [];

    for (const entity of entities) {
      const transform = entity.transform as IsometricTransform | undefined;
      if (!transform) continue;

      // 计算屏幕坐标
      const z = transform.z ?? 0;
      const screen = this.worldToScreen(transform.x, transform.y, z);

      // 缓存结果
      transform._screenX = screen.x;
      transform._screenY = screen.y;
      transform._depth = this.calculateDepth(transform.x, transform.y, z);

      // 添加到排序列表
      if (entity.sprite) {
        this.sortedEntities.push({
          entity,
          depth: transform._depth,
          screenX: screen.x,
          screenY: screen.y,
        });
      }
    }

    // 深度排序
    if (this.config.depthSortEnabled) {
      this.sortedEntities.sort((a, b) => a.depth - b.depth);
    }
  }

  /**
   * 获取排序后的实体列表
   */
  getSortedEntities(): DepthKey[] {
    return this.sortedEntities;
  }

  /**
   * 绘制等距地面网格（调试/编辑器用）
   */
  drawGrid(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    cols: number,
    rows: number,
    options: {
      lineColor?: string;
      lineWidth?: number;
      fillColor?: string;
      highlightTile?: { x: number; y: number };
      highlightColor?: string;
    } = {}
  ): void {
    const {
      lineColor = 'rgba(255, 255, 255, 0.2)',
      lineWidth = 1,
      fillColor,
      highlightTile,
      highlightColor = 'rgba(255, 255, 0, 0.3)',
    } = options;

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;

    for (let y = startY; y < startY + rows; y++) {
      for (let x = startX; x < startX + cols; x++) {
        const points = this.getTileCorners(x, y);

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        // 填充
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }

        // 高亮选中的格子
        if (highlightTile && highlightTile.x === x && highlightTile.y === y) {
          ctx.fillStyle = highlightColor;
          ctx.fill();
        }

        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * 获取地块的四个角的屏幕坐标
   */
  getTileCorners(tileX: number, tileY: number, z: number = 0): Array<{ x: number; y: number }> {
    return [
      this.worldToScreen(tileX, tileY, z),         // 顶部
      this.worldToScreen(tileX + 1, tileY, z),     // 右边
      this.worldToScreen(tileX + 1, tileY + 1, z), // 底部
      this.worldToScreen(tileX, tileY + 1, z),     // 左边
    ];
  }

  /**
   * 绘制等距方块（立方体）
   */
  drawIsometricBox(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number,
    width: number,
    depth: number,
    height: number,
    options: {
      topColor?: string;
      leftColor?: string;
      rightColor?: string;
      stroke?: string;
      strokeWidth?: number;
    } = {}
  ): void {
    const {
      topColor = '#888',
      leftColor = '#666',
      rightColor = '#555',
      stroke,
      strokeWidth = 1,
    } = options;

    // 计算8个顶点
    const top = worldZ + height;

    // 顶面四个点
    const t0 = this.worldToScreen(worldX, worldY, top);
    const t1 = this.worldToScreen(worldX + width, worldY, top);
    const t2 = this.worldToScreen(worldX + width, worldY + depth, top);
    const t3 = this.worldToScreen(worldX, worldY + depth, top);

    // 底面四个点（只用到 b0, b2, b3 - 可见面）
    const b0 = this.worldToScreen(worldX, worldY, worldZ);
    const b2 = this.worldToScreen(worldX + width, worldY + depth, worldZ);
    const b3 = this.worldToScreen(worldX, worldY + depth, worldZ);

    ctx.save();

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
    }

    // 绘制左侧面
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.lineTo(b0.x, b0.y);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();
    if (stroke) ctx.stroke();

    // 绘制右侧面
    ctx.beginPath();
    ctx.moveTo(t3.x, t3.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
    if (stroke) ctx.stroke();

    // 绘制顶面
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();
    if (stroke) ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制等距圆柱体（适合角色）
   */
  drawIsometricCylinder(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number,
    radius: number,
    height: number,
    options: {
      topColor?: string;
      bodyColor?: string;
      bodyGradient?: boolean;
      stroke?: string;
    } = {}
  ): void {
    const {
      topColor = '#888',
      bodyColor = '#666',
      bodyGradient = true,
      stroke,
    } = options;

    const { tileWidth, tileHeight } = this.config;

    // 中心点
    const center = this.worldToScreen(worldX, worldY, worldZ);
    const topCenter = this.worldToScreen(worldX, worldY, worldZ + height);

    // 等距椭圆参数
    const radiusX = radius * (tileWidth / 2) * this.cameraZoom;
    const radiusY = radius * (tileHeight / 2) * this.cameraZoom;

    ctx.save();

    // 绘制圆柱体身体
    if (bodyGradient) {
      const grad = ctx.createLinearGradient(
        center.x - radiusX, center.y,
        center.x + radiusX, center.y
      );
      grad.addColorStop(0, this.adjustBrightness(bodyColor, -30));
      grad.addColorStop(0.5, bodyColor);
      grad.addColorStop(1, this.adjustBrightness(bodyColor, -50));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bodyColor;
    }

    // 身体（连接顶部和底部椭圆的矩形区域）
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI);
    ctx.lineTo(topCenter.x - radiusX, topCenter.y);
    ctx.ellipse(topCenter.x, topCenter.y, radiusX, radiusY, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }

    // 绘制顶部椭圆
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.ellipse(topCenter.x, topCenter.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 绘制阴影
   */
  drawShadow(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number,
    radiusX: number,
    radiusY?: number
  ): void {
    if (!this.config.shadow.enabled) return;

    const { shadow, tileWidth, tileHeight } = this.config;

    // 阴影投射到地面 (z=0)
    const shadowPos = this.worldToScreen(worldX, worldY, 0);

    // 等距椭圆
    const rx = radiusX * (tileWidth / 2) * this.cameraZoom;
    const ry = (radiusY ?? radiusX) * (tileHeight / 2) * this.cameraZoom;

    // 根据高度调整阴影透明度
    const alpha = Math.max(0.05, 0.3 - worldZ * shadow.heightFade);

    ctx.save();
    ctx.fillStyle = shadow.color.replace(/[\d.]+\)$/, `${alpha})`);

    if (shadow.blur > 0) {
      ctx.filter = `blur(${shadow.blur}px)`;
    }

    ctx.beginPath();
    ctx.ellipse(
      shadowPos.x + shadow.offsetX,
      shadowPos.y + shadow.offsetY,
      rx * (1 + worldZ * 0.01), // 高度越高阴影越大
      ry * (1 + worldZ * 0.01),
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  /**
   * 检查点是否在屏幕可见范围内
   */
  isOnScreen(screenX: number, screenY: number, margin: number = 100): boolean {
    return (
      screenX >= -margin &&
      screenX <= this.engine.width + margin &&
      screenY >= -margin &&
      screenY <= this.engine.height + margin
    );
  }

  /**
   * 移动摄像机
   */
  moveCamera(dx: number, dy: number): void {
    this.cameraX += dx;
    this.cameraY += dy;
  }

  /**
   * 设置摄像机位置（世界坐标）
   * 将摄像机中心对准指定的世界坐标
   */
  setCameraPosition(worldX: number, worldY: number): void {
    const { tileWidth, tileHeight } = this.config;

    // 直接计算等距投影坐标（不应用摄像机偏移）
    const screenX = (worldX - worldY) * (tileWidth / 2);
    const screenY = (worldX + worldY) * (tileHeight / 2);

    // 设置摄像机使该位置位于屏幕中心
    this.cameraX = screenX;
    this.cameraY = screenY;
  }

  /**
   * 摄像机跟随实体
   */
  followEntity(entity: GameEntity, smoothing: number = 0.1): void {
    const transform = entity.transform as IsometricTransform | undefined;
    if (!transform) return;

    const { tileWidth, tileHeight, heightScale } = this.config;
    const z = transform.z ?? 0;

    // 直接计算等距投影坐标（不应用摄像机偏移）
    const targetCamX = (transform.x - transform.y) * (tileWidth / 2);
    const targetCamY = (transform.x + transform.y) * (tileHeight / 2) - z * heightScale;

    this.cameraX += (targetCamX - this.cameraX) * smoothing;
    this.cameraY += (targetCamY - this.cameraY) * smoothing;
  }

  /**
   * 调整颜色亮度
   */
  private adjustBrightness(color: string, amount: number): string {
    // 简单实现：处理 #RRGGBB 格式
    if (color.startsWith('#') && color.length === 7) {
      const r = Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) + amount));
      const g = Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) + amount));
      const b = Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) + amount));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
  }
}

/**
 * 创建等距变换组件
 */
export function createIsometricTransform(
  x: number = 0,
  y: number = 0,
  z: number = 0
): IsometricTransform {
  return {
    x,
    y,
    z,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

/**
 * 创建等距精灵组件
 */
export function createIsometricSprite(options: Partial<IsometricSprite> = {}): IsometricSprite {
  return {
    width: options.width ?? 64,
    height: options.height ?? 64,
    anchorX: options.anchorX ?? 0.5,
    anchorY: options.anchorY ?? 1,
    color: options.color,
    texture: options.texture,
    alpha: options.alpha ?? 1,
    visible: options.visible ?? true,
    render: options.render,
    castShadow: options.castShadow ?? true,
    shadowScale: options.shadowScale ?? 0.5,
  };
}
