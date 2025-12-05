/**
 * 空间哈希分区系统
 * 使用空间哈希网格加速空间查询，避免全遍历
 * 适用场景：大量实体时的碰撞检测、范围查询、最近邻查询
 */

import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';
import type { GameEntity } from '../core/Entity';

/** 网格单元 */
interface SpatialCell {
  entities: Set<GameEntity>;
}

/** 查询结果 */
export interface QueryResult {
  entity: GameEntity;
  distance: number;
}

/**
 * 空间哈希系统
 * 将世界空间划分为网格，快速查询附近实体
 */
export class SpatialHashSystem extends System {
  static phase = SystemPhase.Early; // 早期执行：在其他系统使用前构建网格

  /** 网格单元大小 (像素) */
  cellSize = 64;

  /** 空间哈希网格 */
  private grid = new Map<string, SpatialCell>();

  /** 实体到单元的映射 (用于快速移除) */
  private entityToCells = new Map<GameEntity, Set<string>>();

  /** 是否启用调试渲染 */
  showDebug = false;

  onUpdate(): void {
    // 清空网格
    this.grid.clear();
    this.entityToCells.clear();

    // 重新构建网格
    for (const entity of this.engine.world.entities) {
      if (!entity.transform) continue;
      this.insert(entity);
    }
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    if (!this.showDebug) return;

    // 绘制网格线
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;

    const minX = Math.floor(-this.engine.width / 2 / this.cellSize) * this.cellSize;
    const maxX = Math.ceil(this.engine.width / 2 / this.cellSize) * this.cellSize;
    const minY = Math.floor(-this.engine.height / 2 / this.cellSize) * this.cellSize;
    const maxY = Math.ceil(this.engine.height / 2 / this.cellSize) * this.cellSize;

    // 垂直线
    for (let x = minX; x <= maxX; x += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
      ctx.stroke();
    }

    // 水平线
    for (let y = minY; y <= maxY; y += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
      ctx.stroke();
    }

    // 高亮有实体的单元格
    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
    for (const [key, cell] of this.grid.entries()) {
      if (cell.entities.size === 0) continue;
      const [x, y] = this.parseKey(key);
      ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

      // 显示实体数量
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px monospace';
      ctx.fillText(
        cell.entities.size.toString(),
        x * this.cellSize + this.cellSize / 2 - 5,
        y * this.cellSize + this.cellSize / 2 + 5
      );
      ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
    }

    ctx.restore();
  }

  /**
   * 插入实体到网格
   */
  private insert(entity: GameEntity): void {
    if (!entity.transform) return;

    const { x, y } = entity.transform;
    const sprite = entity.sprite;
    const collider = entity.collider;

    // 计算实体占据的单元格范围
    let width = 0;
    let height = 0;

    if (sprite) {
      width = sprite.width || 0;
      height = sprite.height || 0;
    } else if (collider) {
      if (collider.type === 'circle') {
        width = height = (collider.radius || 0) * 2;
      } else {
        width = collider.width || 0;
        height = collider.height || 0;
      }
    }

    // 默认大小
    if (width === 0) width = 32;
    if (height === 0) height = 32;

    const minX = Math.floor((x - width / 2) / this.cellSize);
    const maxX = Math.floor((x + width / 2) / this.cellSize);
    const minY = Math.floor((y - height / 2) / this.cellSize);
    const maxY = Math.floor((y + height / 2) / this.cellSize);

    const cells = new Set<string>();

    // 将实体添加到所有占据的单元格
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = this.makeKey(cx, cy);
        cells.add(key);

        if (!this.grid.has(key)) {
          this.grid.set(key, { entities: new Set() });
        }
        this.grid.get(key)!.entities.add(entity);
      }
    }

    this.entityToCells.set(entity, cells);
  }

  /**
   * 查询指定区域内的实体
   * @param x 中心 X
   * @param y 中心 Y
   * @param radius 半径
   * @returns 区域内的实体集合
   */
  queryRadius(x: number, y: number, radius: number): Set<GameEntity> {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    const results = new Set<GameEntity>();

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const cell = this.grid.get(this.makeKey(cx, cy));
        if (!cell) continue;

        for (const entity of cell.entities) {
          if (!entity.transform) continue;

          // 精确圆形检测
          const dx = entity.transform.x - x;
          const dy = entity.transform.y - y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= radius * radius) {
            results.add(entity);
          }
        }
      }
    }

    return results;
  }

  /**
   * 查询矩形区域内的实体
   * @param x 左上角 X
   * @param y 左上角 Y
   * @param width 宽度
   * @param height 高度
   * @returns 区域内的实体集合
   */
  queryRect(x: number, y: number, width: number, height: number): Set<GameEntity> {
    const minX = Math.floor(x / this.cellSize);
    const maxX = Math.floor((x + width) / this.cellSize);
    const minY = Math.floor(y / this.cellSize);
    const maxY = Math.floor((y + height) / this.cellSize);

    const results = new Set<GameEntity>();

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const cell = this.grid.get(this.makeKey(cx, cy));
        if (!cell) continue;

        for (const entity of cell.entities) {
          if (!entity.transform) continue;

          // 精确矩形检测
          const ex = entity.transform.x;
          const ey = entity.transform.y;

          if (ex >= x && ex <= x + width && ey >= y && ey <= y + height) {
            results.add(entity);
          }
        }
      }
    }

    return results;
  }

  /**
   * 查询最近的 N 个实体
   * @param x 中心 X
   * @param y 中心 Y
   * @param count 数量
   * @param maxRadius 最大搜索半径 (可选)
   * @returns 按距离排序的实体数组
   */
  queryNearest(x: number, y: number, count: number, maxRadius = Infinity): QueryResult[] {
    const searchRadius = Math.min(maxRadius, this.cellSize * 10);
    const candidates = this.queryRadius(x, y, searchRadius);

    const results: QueryResult[] = [];

    for (const entity of candidates) {
      if (!entity.transform) continue;

      const dx = entity.transform.x - x;
      const dy = entity.transform.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= maxRadius) {
        results.push({ entity, distance });
      }
    }

    // 按距离排序
    results.sort((a, b) => a.distance - b.distance);

    // 返回前 N 个
    return results.slice(0, count);
  }

  /**
   * 获取实体附近的其他实体
   * @param entity 查询的实体
   * @param radius 搜索半径 (可选，默认使用 cellSize)
   * @returns 附近的实体集合 (不包括自身)
   */
  getNearby(entity: GameEntity, radius?: number): Set<GameEntity> {
    if (!entity.transform) return new Set();

    const searchRadius = radius ?? this.cellSize;
    const results = this.queryRadius(entity.transform.x, entity.transform.y, searchRadius);

    // 移除自身
    results.delete(entity);
    return results;
  }

  /**
   * 生成网格单元 key
   */
  private makeKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * 解析网格单元 key
   */
  private parseKey(key: string): [number, number] {
    const [x, y] = key.split(',').map(Number);
    return [x, y];
  }

  /**
   * 获取网格统计信息
   */
  getStats(): {
    cellCount: number;
    entityCount: number;
    avgEntitiesPerCell: number;
    maxEntitiesPerCell: number;
  } {
    let totalEntities = 0;
    let maxEntities = 0;

    for (const cell of this.grid.values()) {
      const count = cell.entities.size;
      totalEntities += count;
      maxEntities = Math.max(maxEntities, count);
    }

    return {
      cellCount: this.grid.size,
      entityCount: this.engine.world.entities.length,
      avgEntitiesPerCell: this.grid.size > 0 ? totalEntities / this.grid.size : 0,
      maxEntitiesPerCell: maxEntities,
    };
  }
}
